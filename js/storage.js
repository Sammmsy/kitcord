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
