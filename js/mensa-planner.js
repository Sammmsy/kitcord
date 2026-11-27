import { loadMensaTable, saveMensaTable } from "./storage.js";
import { AREAS, MAP_SIZE, OCCUPIED } from "./mensa-config.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const MIN_SCALE = 1.3;   // on narrow screens a plan unit is at least this many px (tables stay tappable)
const MAX_SCALE = 4;     // zoom limit
const WIDE_STAGE = 700;  // from this stage width on, the plan simply fits the screen
const ZOOM_STEP = 1.25;

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
let selection = loadMensaTable(); // { area, table } | null
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

const tableKey = (areaId, tableId) => `${areaId}:${tableId}`;
const areaById = id => AREAS.find(area => area.id === id);

function describeSelection() {
  if (!selection) return "";
  const area = areaById(selection.area);
  return `${area ? area.name : selection.area} · Table ${selection.table}`;
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

    makeActivatable(g, hasPlan ? `Open floor plan: ${area.name}` : `${area.name} (no floor plan yet)`, () => openArea(area));
  }
}

/* ---------- floor plan ---------- */

function renderPlan(area) {
  const layout = area.layout;
  planHost.replaceChildren();

  if (!layout) {
    const empty = document.createElement("p");
    empty.className = "mensa-empty";
    empty.textContent = `There is no floor plan for ${area.name} yet.`;
    planHost.append(empty);
    return;
  }

  const root = svg("svg", {
    viewBox: `0 0 ${layout.width} ${layout.height}`,
    class: "mensa-svg mensa-svg-room",
    role: "group",
    "aria-label": `Floor plan ${area.name}`,
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
    const key = tableKey(area.id, table.id);
    const g = svg("g", { class: "mensa-table", "data-key": key }, root);
    const round = table.shape === "round";

    if (round) svg("circle", { cx: table.cx, cy: table.cy, r: table.r, class: "mensa-table-body" }, g);
    else svg("rect", { x: table.x, y: table.y, width: table.w, height: table.h, rx: 2, class: "mensa-table-body" }, g);
    const label = svg("text", {
      x: round ? table.cx : table.x + table.w / 2, y: round ? table.cy : table.y + table.h / 2, class: "mensa-table-label",
      "text-anchor": "middle", "dominant-baseline": "central", fill: layout.groups[table.group] || "currentColor",
    }, g);
    label.textContent = table.id;
    if (layout.labelSize) label.style.fontSize = `${layout.labelSize}px`;

    if (occupied.has(key)) {
      g.classList.add("is-occupied");
      g.setAttribute("aria-label", `Table ${table.id} (occupied)`);
      g.setAttribute("aria-disabled", "true");
    } else {
      makeActivatable(g, `Table ${table.id}`, () => toggleTable(area, table.id));
    }
  }

  syncTables();
}

function syncTables() {
  for (const el of planHost.querySelectorAll(".mensa-table")) {
    const selected = Boolean(selection && el.dataset.key === tableKey(selection.area, selection.table));
    el.classList.toggle("is-selected", selected);
    if (el.getAttribute("role") === "button") el.setAttribute("aria-pressed", String(selected));
  }
}

function renderSummary() {
  const text = describeSelection();
  summary.textContent = text ? `Your table: ${text}` : "No table selected";
  clearButton.disabled = !selection;
  savedNote.textContent = text ? `Saved table: ${text}` : "Choose an area to find a table.";
}

function toggleTable(area, tableId) {
  const same = selection && selection.area === area.id && selection.table === tableId;
  selection = same ? null : { area: area.id, table: tableId };
  saveMensaTable(selection);
  syncTables();
  renderSummary();
  notify(same ? "Table cleared" : "Table saved");
}

/* ---------- responsive sizing & zoom ---------- */

let planWidth = 0;
let manualZoom = false;

function stageInnerWidth() {
  const style = getComputedStyle(stage);
  return stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

/** Width in px that fits the plan on screen (wide) or keeps tables tappable (narrow). */
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
  saveMensaTable(null);
  syncTables();
  renderSummary();
  notify("Table cleared");
});

showOverview();
