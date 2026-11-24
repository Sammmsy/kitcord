export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const SLOTS = [
  { id: "s1", start: "08:00", end: "09:30" },
  { id: "s2", start: "09:45", end: "11:15" },
  { id: "s3", start: "11:30", end: "13:00" },
  { id: "s4", start: "14:00", end: "15:30" },
  { id: "s5", start: "15:45", end: "17:15" },
  { id: "s6", start: "17:30", end: "19:00" }
];

const BREAKS = [
  { after: 0, start: "09:30", end: "09:45", label: "15-minute break" },
  { after: 1, start: "11:15", end: "11:30", label: "15-minute break" },
  { after: 2, start: "13:00", end: "14:00", label: "Lunch break" },
  { after: 3, start: "15:30", end: "15:45", label: "15-minute break" },
  { after: 4, start: "17:15", end: "17:30", label: "15-minute break" }
];

export function eventKey(day, slotId) {
  return `${day}|${slotId}`;
}

export function renderTimetable(container, events, onSlotClick) {
  container.replaceChildren();

  const corner = document.createElement("div");
  corner.className = "corner";
  corner.textContent = "TIME";
  container.append(corner);

  for (const day of DAYS) {
    const heading = document.createElement("div");
    heading.className = "day-heading";
    heading.textContent = day.slice(0, 3).toUpperCase();
    container.append(heading);
  }

  SLOTS.forEach((slot, index) => {
    const time = document.createElement("div");
    time.className = "time-label";
    time.textContent = slot.start;
    container.append(time);

    for (const day of DAYS) {
      const key = eventKey(day, slot.id);
      const event = events[key];
      const cell = document.createElement("div");
      cell.className = "slot-cell";

      const button = document.createElement("button");
      button.type = "button";
      button.className = `slot-button${event ? " is-busy" : ""}`;
      button.setAttribute("aria-label", `${day}, ${slot.start} to ${slot.end}: ${event ? event.title : "Available. Add event"}`);
      if (event) {
        const title = document.createElement("span");
        title.className = "event-name";
        title.textContent = event.title;
        const range = document.createElement("span");
        range.className = "event-time";
        range.textContent = `${slot.start} – ${slot.end}`;
        button.append(title, range);
      } else {
        const plus = document.createElement("span");
        plus.className = "plus";
        plus.textContent = "+";
        const empty = document.createElement("span");
        empty.className = "slot-empty";
        empty.textContent = "Add event";
        button.append(plus, empty);
      }
      button.addEventListener("click", () => onSlotClick(day, slot, key, event || null));
      cell.append(button);
      container.append(cell);
    }

    const breakInfo = BREAKS.find(item => item.after === index);
    if (breakInfo) {
      const row = document.createElement("div");
      row.className = "break-row";
      const range = document.createElement("span");
      range.className = "break-time";
      range.textContent = `${breakInfo.start}–${breakInfo.end}`;
      const line = document.createElement("div");
      line.className = "break-line";
      const label = document.createElement("span");
      label.textContent = breakInfo.label;
      line.append(label);
      row.append(range, line);
      container.append(row);
    }
  });
}
