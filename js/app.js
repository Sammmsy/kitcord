import { loadEvents, saveEvents } from "./storage.js";
import { DAYS, SLOTS, eventKey, renderTimetable } from "./timetable.js";

const timetable = document.querySelector("#timetable");
const dialog = document.querySelector("#event-dialog");
const form = document.querySelector("#event-form");
const titleInput = document.querySelector("#event-title");
const dialogTitle = document.querySelector("#dialog-title");
const slotDescription = document.querySelector("#slot-description");
const deleteButton = document.querySelector("#delete-event");
const toast = document.querySelector("#toast");

let events = loadEvents();
let activeKey = null;
let toastTimer;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
}

function refresh() {
  renderTimetable(timetable, events, openEventDialog);
}

function openEventDialog(day, slot, key, existingEvent) {
  activeKey = key;
  dialogTitle.textContent = existingEvent ? "Edit event" : "Add an event";
  slotDescription.textContent = `${day} · ${slot.start}–${slot.end}`;
  titleInput.value = existingEvent?.title || "";
  deleteButton.hidden = !existingEvent;
  dialog.showModal();
  requestAnimationFrame(() => titleInput.focus());
}

function closeDialog() {
  dialog.close();
  activeKey = null;
  form.reset();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!activeKey) return;
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  events[activeKey] = { title };
  saveEvents(events);
  closeDialog();
  refresh();
  notify("Event saved");
});

deleteButton.addEventListener("click", () => {
  if (!activeKey || !events[activeKey]) return;
  delete events[activeKey];
  saveEvents(events);
  closeDialog();
  refresh();
  notify("Event deleted");
});

document.querySelector("#close-dialog").addEventListener("click", closeDialog);
document.querySelector("#cancel-event").addEventListener("click", closeDialog);

dialog.addEventListener("click", event => {
  if (event.target === dialog) closeDialog();
});

document.querySelector("#clear-week").addEventListener("click", () => {
  if (!Object.keys(events).length) {
    notify("There are no events to clear");
    return;
  }
  if (!confirm("Clear all events for the week? This cannot be undone.")) return;
  events = {};
  saveEvents(events);
  refresh();
  notify("All events cleared");
});

// Keep the constants imported here as a simple integrity check for future extensions.
if (DAYS.length !== 5 || SLOTS.length !== 6) {
  console.warn("The timetable configuration has changed. Review the timetable layout.");
}

refresh();
