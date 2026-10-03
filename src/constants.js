// src/constants.js

export const STORAGE_KEYS = {
  CHOICES: "workout_user_choices",
  TRACKER: "workout_matrix_checks",
  MATRIX_CONFIG: "workout_matrix_config",
  WORKOUT_LOGS: "workout_completed_logs",
  MATRIX_LOGS: "workout_matrix_saved_logs",
  THEME: "workout_theme_mode",
  AUTH_USER: "workout_auth_user_id",
  ASSIGNMENTS: "workout_athlete_assignments",
  INQUIRIES: "workout_trainer_inquiries",
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const DAY_INDEX_MAP = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const PRESET_ROUTINES = [
  {
    name: "Full Body (3x/Wk)",
    ids: [1, 19, 24, 6],
    days: ["Mon", "Wed", "Fri"],
    sets: 3,
  },
  {
    name: "Core & Posture",
    ids: [4, 13, 18, 28],
    days: ["Tue", "Thu", "Sat"],
    sets: 3,
  },
  {
    name: "Daily Mobility",
    ids: [2, 9, 23, 49],
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    sets: 2,
  },
];