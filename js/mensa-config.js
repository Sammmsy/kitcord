// Mensa data: map areas (overview) and seat layouts (per room).
// All coordinates are plain SVG units. Edit this file to add rooms/tables,
// no rendering code needs to change.

/** Builds a column/row of tables: ids group+from … group+to, spaced by `step`. */
function tableRun(group, { x, y, step, from, to, w = 100, h = 36, orient = "h", seats = 5, axis = "y" }) {
  const tables = [];
  for (let n = from; n <= to; n++) {
    const offset = Math.round((n - from) * step);
    tables.push({
      id: `${group}${n}`, group, orient, seats, w, h,
      x: axis === "x" ? x + offset : x,
      y: axis === "y" ? y + offset : y,
    });
  }
  return tables;
}

/** Cafeteria, modelled after the floor plan (walls omitted on purpose). */
// Coordinates below were measured on the screenshot; shift() moves them to the origin.
const shift = (tables, dx = -20, dy = -88) => tables.map(t =>
  t.shape === "round" ? { ...t, cx: t.cx + dx, cy: t.cy + dy } : { ...t, x: t.x + dx, y: t.y + dy });

const COLS_X = [273, 341, 410, 479, 551, 621, 692]; // column centres of the E/F/G/H grid

const cafeteria = {
  width: 705,
  height: 465,
  seatSize: 7,
  labelSize: 12,
  walls: [],
  blocks: [],
  groups: {
    A: "#e8381b", B: "#1f7a1f", C: "#1c2fb5", D: "#6a1fb0",
    E: "#e0194d", F: "#9a4a12", G: "#1a6b5a", H: "#d0213b",
  },
  tables: shift([
    // Horizontal 43×24 tables, 3 seats per side
    ...tableRun("A", { x: 110, y: 96, step: 38.2, from: 1, to: 6, w: 43, h: 24, seats: 3 }),
    ...tableRun("B", { x: 27, y: 355, step: 37.9, from: 1, to: 5, w: 43, h: 24, seats: 3 }),
    ...tableRun("C", { x: 110, y: 360, step: 37.5, from: 1, to: 5, w: 43, h: 24, seats: 3 }),
    // Vertical 28×56 tables
    { id: "D1", group: "D", x: 197, y: 371, w: 28, h: 56, orient: "v", seats: 3 },
    { id: "D2", group: "D", x: 197, y: 441, w: 28, h: 56, orient: "v", seats: 3 },
    // Row of 7 long vertical tables, 4 seats per side
    ...COLS_X.map((cx, i) => (
      { id: `E${i + 1}`, group: "E", x: cx - 15, y: 286, w: 30, h: 60, orient: "v", seats: 4 }
    )),
    // Three rows of round tables, 8 seats each
    ...["F", "G", "H"].flatMap((group, row) => COLS_X.map((cx, i) => (
      { id: `${group}${i + 1}`, group, shape: "round", cx, cy: 389 + row * 60, r: 16, seats: 8 }
    ))),
  ]),
};

/** Halle 1, modelled after the floor plan (outer wall omitted on purpose). */
const halle1 = {
  width: 621,
  height: 620,
  seatSize: 8,   // smaller scale than the cafeteria
  labelSize: 13,
  walls: [],
  blocks: [
    { label: "Treppen-\nhaus", x: 217, y: 167, w: 194, h: 235, size: 15 },
    { label: "Treppen-\nhaus", x: 19, y: 420, w: 84, h: 65, size: 9 },
  ],
  groups: {
    A: "#e8381b", B: "#1f7a1f", C: "#1c2fb5", D: "#6a1fb0", E: "#e0194d", F: "#9a4a12",
  },
  tables: [
    // Horizontal 70×26 tables, 4 seats per side
    ...tableRun("A", { x: 25, y: 59, step: 45.6, from: 1, to: 8, w: 70, h: 26, seats: 4 }),
    { id: "A9", group: "A", x: 25, y: 493, w: 70, h: 26, orient: "h", seats: 4 },
    { id: "A10", group: "A", x: 25, y: 533, w: 70, h: 26, orient: "h", seats: 4 },
    { id: "A11", group: "A", x: 25, y: 576, w: 70, h: 26, orient: "h", seats: 4 },
    ...tableRun("B", { x: 138, y: 177, step: 46.2, from: 1, to: 5, w: 70, h: 26, seats: 4 }),
    ...tableRun("C", { x: 421, y: 177, step: 46.2, from: 1, to: 5, w: 70, h: 26, seats: 4 }),
    ...tableRun("D", { x: 531, y: 98, step: 46, from: 1, to: 11, w: 70, h: 26, seats: 4 }),
    // Vertical 24×70 tables
    ...tableRun("E", { x: 218, y: 410, step: 40.3, from: 1, to: 5, w: 24, h: 70, orient: "v", seats: 4, axis: "x" }),
    ...[119, 160, 202, 244, 286, 328, 371, 413, 448, 488].map((x, i) => (
      { id: `F${i + 1}`, group: "F", x, y: 531, w: 24, h: 70, orient: "v", seats: 4 }
    )),
  ],
};

export const MAP_SIZE = { width: 948, height: 704 };

/**
 * Clickable areas of the overview map. `layout: null` = no seat plan yet.
 * `light: true` renders the label in dark ink (for pale fills).
 */
export const AREAS = [
  { id: "halle1", name: "Halle 1", fill: "#ff8a4c", points: "12,20 275,20 275,245 12,245", label: [143, 132], layout: halle1 },
  { id: "koeri", name: "[koeri]Werk", fill: "#ffa45a", points: "12,248 275,248 275,465 12,465", label: [143, 356], layout: null },
  { id: "halle2", name: "Halle 2", fill: "#5b8fc9", points: "278,20 646,20 646,242 527,242 527,193 278,193", label: [462, 105], layout: null },
  { id: "pizza", name: "[pizza]Werk", fill: "#3fb6c4", points: "650,20 930,20 930,230 818,230 818,280 664,280 664,242 650,242", label: [788, 135], layout: null },
  { id: "aussen", name: "Außenbereich", fill: "#fbe6d8", light: true, points: "280,194 526,194 526,472 280,472", label: [410, 323], layout: null },
  { id: "cafeteria", name: "Cafeteria", fill: "#a86a82", points: "538,245 664,245 664,280 752,280 752,343 800,343 800,280 916,280 916,646 606,646 606,561 538,561", label: [734, 432], layout: cafeteria },
];

/** Seats that are already taken, as "areaId:tableId-seatNumber". Fill from a backend later. */
export const OCCUPIED = [];
