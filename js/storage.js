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

const MENSA_SEAT_KEY = "weekly-planner-mensa-seat-v1";

/** Read the saved Mensa seat ({ area, table, seat }) or null. */
export function loadMensaSeat() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MENSA_SEAT_KEY) || "null");
    return parsed && typeof parsed.area === "string" && typeof parsed.table === "string" && Number.isInteger(parsed.seat)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Persist the chosen seat; pass null to clear it. */
export function saveMensaSeat(seat) {
  try {
    if (seat) localStorage.setItem(MENSA_SEAT_KEY, JSON.stringify(seat));
    else localStorage.removeItem(MENSA_SEAT_KEY);
    return true;
  } catch {
    return false;
  }
}
