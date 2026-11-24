import { loadMensaSeat, saveMensaSeat } from "./storage.js";
import { AREAS, MAP_SIZE, OCCUPIED } from "./mensa-config.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_SCALE = 1.3;   // on narrow screens a plan unit is at least this many px (seats stay tappable)
const MAX_SCALE = 4;     // zoom limit
const WIDE_STAGE = 700;  // from this stage width on, the plan simply fits the screen
const ZOOM_STEP = 1.25;
const SEAT = 11; // default seat square size in SVG units (layouts may override via seatSize)

const overviewView = document.querySelector("#mensa-overview");
const roomView = document.querySelector("#mensa-room");
const mapHost = document.querySelector("#mensa-map");
const planHost = document.querySelector("#mensa-plan");
const roomTitle = document.querySelector("#mensa-room-title");
const summary = document.querySelector("#mensa-summary");
const clearButton = document.querySelector("#mensa-clear");
const backButton = document.querySelector("#mensa-back");
const savedNote = document.querySelector("#mensa-saved");
const stage = planHost.parentElement;
const zoomIn = document.querySelector("#mensa-zoom-in");
const zoomOut = document.querySelector("#mensa-zoom-out");
const zoomFit = document.querySelector("#mensa-zoom-fit");
const toast = document.querySelector("#toast");

const occupied = new Set(OCCUPIED);
let selection = loadMensaSeat(); // { area, table, seat } | null
let activeArea = null;
let toastTimer;

/* ---------- helpers ---------- */

function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  parent?.append(el);
  return el;
}

/** Makes an SVG element behave like a button (click, Enter, Space). */
function makeActivatable(el, label, handler) {
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", label);
  el.addEventListener("click", handler);
  el.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

const seatKey = (areaId, tableId, seat) => `${areaId}:${tableId}-${seat}`;
const areaById = id => AREAS.find(area => area.id === id);

function describeSelection() {
  if (!selection) return "";
  const area = areaById(selection.area);
  return `${area ? area.name : selection.area} · Table ${selection.table} · Seat ${selection.seat}`;
}

/* ---------- overview map ---------- */

function renderMap() {
  mapHost.replaceChildren();
  const root = svg("svg", {
    viewBox: `0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`,
    class: "mensa-svg",
    role: "group",
    "aria-label": "Mensa areas",
  }, mapHost);

  for (const area of AREAS) {
    const hasPlan = Boolean(area.layout);
    const g = svg("g", { class: `mensa-area${hasPlan ? "" : " is-empty"}` }, root);
    svg("polygon", { points: area.points, fill: area.fill, class: "mensa-area-shape" }, g);

    const text = svg("text", {
      x: area.label[0], y: area.label[1],
      class: `mensa-area-label${area.light ? " is-dark" : ""}`,
      "text-anchor": "middle", "dominant-baseline": "middle",
    }, g);
    text.textContent = area.name;

    if (selection && selection.area === area.id) {
      const [x, y] = area.label;
      const pin = svg("g", { class: "mensa-pin", transform: `translate(${x}, ${y + 34})` }, g);
      svg("circle", { r: 13 }, pin);
      const check = svg("text", { "text-anchor": "middle", "dominant-baseline": "central" }, pin);
      check.textContent = "✓";
    }

    makeActivatable(g, hasPlan ? `Open seat plan: ${area.name}` : `${area.name} (no seat plan yet)`, () => openArea(area));
  }
}

/* ---------- seat plan ---------- */

/** Returns [{ x, y, angle? }] for every seat of a table (angle only for round tables). */
function seatPositions(table, size) {
  const overlap = Math.round(size * 0.36); // how far a seat tucks under the table edge
  const positions = [];

  if (table.shape === "round") {
    const ring = table.r + size / 2 - overlap;
    for (let i = 0; i < table.seats; i++) {
      const angle = -90 + (360 / table.seats) * i; // seat 1 at the top, clockwise
      const rad = (angle * Math.PI) / 180;
      positions.push({
        x: table.cx + ring * Math.cos(rad) - size / 2,
        y: table.cy + ring * Math.sin(rad) - size / 2,
        angle: angle + 90,
      });
    }
    return positions;
  }

  const n = table.seats;
  const span = table.orient === "h" ? table.w : table.h;
  const gap = (span - n * size) / (n + 1);
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < n; i++) {
      const along = gap * (i + 1) + size * i;
      if (table.orient === "h") {
        positions.push({ x: table.x + along, y: side === 0 ? table.y - size + overlap : table.y + table.h - overlap });
      } else {
        positions.push({ x: side === 0 ? table.x - size + overlap : table.x + table.w - overlap, y: table.y + along });
      }
    }
  }
  return positions;
}

function renderPlan(area) {
  const layout = area.layout;
  planHost.replaceChildren();

  if (!layout) {
    const empty = document.createElement("p");
    empty.className = "mensa-empty";
    empty.textContent = `There is no seat plan for ${area.name} yet.`;
    planHost.append(empty);
    return;
  }

  const root = svg("svg", {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    class: "mensa-svg mensa-svg-room",
    role: "group",
    "aria-label": `Seat plan ${area.name}`,
  }, planHost);

  for (const [x1, y1, x2, y2] of layout.walls) {
    svg("line", { x1, y1, x2, y2, class: "mensa-wall" }, root);
  }

  for (const block of layout.blocks) {
    svg("rect", { x: block.x, y: block.y, width: block.w, height: block.h, class: "mensa-block" }, root);
    const lines = block.label.split("\n");
    const fontSize = block.size ?? (block.big ? 24 : 15);
    const lineHeight = Math.round(fontSize * 1.1);
    const text = svg("text", {
      x: block.x + block.w / 2, y: block.y + block.h / 2,
      class: "mensa-block-label",
      "text-anchor": "middle", "dominant-baseline": "middle",
    }, root);
    text.style.fontSize = `${fontSize}px`;
    lines.forEach((line, i) => {
      const span = svg("tspan", { x: block.x + block.w / 2, dy: i === 0 ? -((lines.length - 1) * lineHeight) / 2 : lineHeight }, text);
      span.textContent = line;
    });
  }

  for (const table of layout.tables) {
    const g = svg("g", { class: "mensa-table" }, root);
    const round = table.shape === "round";
    if (round) svg("circle", { cx: table.cx, cy: table.cy, r: table.r, class: "mensa-table-body" }, g);
    else svg("rect", { x: table.x, y: table.y, width: table.w, height: table.h, rx: 2, class: "mensa-table-body" }, g);
    const label = svg("text", {
      x: round ? table.cx : table.x + table.w / 2, y: round ? table.cy : table.y + table.h / 2, class: "mensa-table-label",
      "text-anchor": "middle", "dominant-baseline": "central", fill: layout.groups[table.group] || "currentColor",
    }, g);
    label.textContent = table.id;
    if (layout.labelSize) label.style.fontSize = `${layout.labelSize}px`;

    const size = layout.seatSize ?? SEAT;
    seatPositions(table, size).forEach(({ x, y, angle }, index) => {
      const number = index + 1;
      const key = seatKey(area.id, table.id, number);
      const seat = svg("rect", { x, y, width: size, height: size, rx: 2, class: "mensa-seat", "data-key": key }, g);
      if (angle !== undefined) seat.setAttribute("transform", `rotate(${angle.toFixed(1)} ${(x + size / 2).toFixed(1)} ${(y + size / 2).toFixed(1)})`);
      const name = `Table ${table.id}, seat ${number}`;

      if (occupied.has(key)) {
        seat.classList.add("is-occupied");
        seat.setAttribute("aria-label", `${name} (occupied)`);
        seat.setAttribute("aria-disabled", "true");
      } else {
        makeActivatable(seat, name, () => toggleSeat(area, table.id, number));
      }
    });
  }

  syncSeats();
}

function syncSeats() {
  for (const el of planHost.querySelectorAll(".mensa-seat")) {
    const selected = Boolean(activeArea && selection &&
      el.dataset.key === seatKey(selection.area, selection.table, selection.seat));
    el.classList.toggle("is-selected", selected);
    if (el.getAttribute("role") === "button") el.setAttribute("aria-pressed", String(selected));
  }
}

function renderSummary() {
  const text = describeSelection();
  summary.textContent = text ? `Your seat: ${text}` : "No seat selected";
  clearButton.disabled = !selection;
  savedNote.textContent = text ? `Saved seat: ${text}` : "Choose an area to find a seat.";
}

function toggleSeat(area, tableId, number) {
  const same = selection && selection.area === area.id && selection.table === tableId && selection.seat === number;
  selection = same ? null : { area: area.id, table: tableId, seat: number };
  saveMensaSeat(selection);
  syncSeats();
  renderSummary();
  notify(same ? "Seat cleared" : "Seat saved");
}

/* ---------- responsive sizing & zoom ---------- */

let planWidth = 0;
let manualZoom = false;

function stageInnerWidth() {
  const style = getComputedStyle(stage);
  return stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/** Width in px that fits the plan on screen (wide) or keeps seats tappable (narrow). */
function fitWidth(layout) {
  const available = stageInnerWidth();
  const byHeight = window.innerHeight * 0.76 * (layout.width / layout.height);
  return available >= WIDE_STAGE
    ? Math.min(available, byHeight)
    : Math.max(available, MIN_SCALE * layout.width);
}

function setPlanWidth(width) {
  const layout = activeArea?.layout;
  const svgEl = planHost.querySelector("svg");
  if (!layout || !svgEl || stageInnerWidth() <= 0) return;
  const min = Math.min(stageInnerWidth(), window.innerHeight * 0.76 * (layout.width / layout.height));
  planWidth = Math.min(Math.max(width, min), MAX_SCALE * layout.width);
  svgEl.style.width = `${Math.round(planWidth)}px`;
  zoomOut.disabled = planWidth <= min + 1;
  zoomIn.disabled = planWidth >= MAX_SCALE * layout.width - 1;
}

function resetZoom() {
  manualZoom = false;
  if (activeArea?.layout) setPlanWidth(fitWidth(activeArea.layout));
}

zoomIn.addEventListener("click", () => { manualZoom = true; setPlanWidth(planWidth * ZOOM_STEP); });
zoomOut.addEventListener("click", () => { manualZoom = true; setPlanWidth(planWidth / ZOOM_STEP); });
zoomFit.addEventListener("click", resetZoom);

window.addEventListener("resize", () => {
  if (activeArea && !manualZoom) resetZoom();
});

/* ---------- navigation ---------- */

function openArea(area) {
  activeArea = area;
  roomTitle.textContent = area.name;
  renderPlan(area);
  renderSummary();
  overviewView.hidden = true;
  roomView.hidden = false;
  resetZoom(); // needs the visible stage to measure its width
  backButton.focus();
}

function showOverview() {
  activeArea = null;
  roomView.hidden = true;
  overviewView.hidden = false;
  renderMap();
  renderSummary();
}

backButton.addEventListener("click", showOverview);

clearButton.addEventListener("click", () => {
  selection = null;
  saveMensaSeat(null);
  syncSeats();
  renderSummary();
  notify("Seat cleared");
});

showOverview();
