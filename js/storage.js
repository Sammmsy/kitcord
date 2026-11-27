const STORAGE_KEY = "weekly-planner-events-v1";

/** Read saved events safely; malformed or unavailable storage returns an empty object. */
export function loadEvents() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist the complete event map in this browser. */
export function saveEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return true;
  } catch {
    return false;
  }
}

const MENSA_TABLE_KEY = "weekly-planner-mensa-table-v1";

/** Read the saved Mensa table ({ area, table }) or null. */
export function loadMensaTable() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MENSA_TABLE_KEY) || "null");
    return parsed && typeof parsed.area === "string" && typeof parsed.table === "string"
      ? { area: parsed.area, table: parsed.table }
      : null;
  } catch {
    return null;
  }
}

/** Persist the chosen table; pass null to clear it. */
export function saveMensaTable(table) {
  try {
    if (table) localStorage.setItem(MENSA_TABLE_KEY, JSON.stringify(table));
    else localStorage.removeItem(MENSA_TABLE_KEY);
    return true;
  } catch {
    return false;
  }
}
