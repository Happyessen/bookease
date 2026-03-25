// src/utils.js
// ─── Shared utilities ─────────────────────────────────────────

// All available time slots in a day
export const ALL_SLOTS = [
  '9:00 AM',  '9:30 AM',  '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '2:00 PM',  '2:30 PM',  '3:00 PM',  '3:30 PM',
  '4:00 PM',  '4:30 PM',  '5:00 PM',  '5:30 PM',
];

// Format a date string nicely: "2026-3-25" → "March 25, 2026"
export function formatDate(dateStr) {
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${months[m - 1]} ${d}, ${y}`;
}

// Get today's date as "YYYY-M-D"
export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Get tomorrow's date as "YYYY-M-D"
export function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Check if a date string is in the past
export function isPastDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Build a success response object
export function ok(data) {
  return { success: true, ...data };
}

// Build an error response object
export function fail(message) {
  return { success: false, error: message };
}
