import type { Alarm, WakeRecord } from "./types"

export const pad = (n: number) => String(n).padStart(2, "0")

export const formatTime = (hour: number, minute: number) => `${pad(hour)}:${pad(minute)}`

// Monday first, the way most of Europe reads a week.
export const WEEK = [
  { day: 1, short: "Mon", letter: "M", name: "Monday" },
  { day: 2, short: "Tue", letter: "T", name: "Tuesday" },
  { day: 3, short: "Wed", letter: "W", name: "Wednesday" },
  { day: 4, short: "Thu", letter: "T", name: "Thursday" },
  { day: 5, short: "Fri", letter: "F", name: "Friday" },
  { day: 6, short: "Sat", letter: "S", name: "Saturday" },
  { day: 0, short: "Sun", letter: "S", name: "Sunday" },
]

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = [
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
]

export function describeDays(days: number[]): string {
  if (days.length === 0) return "Once"
  if (days.length === 7) return "Every day"
  const set = new Set(days)
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays"
  if (days.length === 2 && set.has(0) && set.has(6)) return "Weekends"
  return WEEK.filter((w) => set.has(w.day))
    .map((w) => w.short)
    .join(", ")
}

// The next moment this alarm will ring.
export function nextRing(alarm: Alarm, from: Date = new Date()): Date {
  const candidate = new Date(from)
  candidate.setHours(alarm.hour, alarm.minute, 0, 0)
  for (let i = 0; i < 8; i++) {
    const allowedDay = alarm.days.length === 0 || alarm.days.includes(candidate.getDay())
    if (candidate > from && allowedDay) return candidate
    candidate.setDate(candidate.getDate() + 1)
  }
  return candidate
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// For example "Rings tomorrow, in 9 h 5 min".
export function describeNext(target: Date, now: Date = new Date()): string {
  const minutes = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60000))
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const countdown = h === 0 ? `${m} min` : m === 0 ? `${h} h` : `${h} h ${m} min`

  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  if (dayKey(target) === dayKey(now)) return `Rings in ${countdown}`
  if (dayKey(target) === dayKey(tomorrow)) return `Rings tomorrow, in ${countdown}`
  return `Rings on ${DAY_NAMES[target.getDay()]}`
}

// For example "Monday 19 October".
export function formatLongDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// How many mornings in a row ended with a finished task.
export function currentStreak(records: WakeRecord[], now: Date = new Date()): number {
  const days = new Set(records.map((r) => dayKey(new Date(r.finishedAt))))
  const cursor = new Date(now)
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Average time to finish the task, over the last two weeks of wake-ups.
export function averageSeconds(records: WakeRecord[]): number | null {
  if (records.length === 0) return null
  const recent = records.slice(-14)
  const total = recent.reduce((sum, r) => sum + r.seconds, 0)
  return Math.round(total / recent.length)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s === 0 ? `${m} min` : `${m} min ${s} s`
}

// "Good morning", "Good afternoon"... for the top of the home screen.
export function greeting(d: Date): string {
  const hour = d.getHours()
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 18) return "Good afternoon"
  if (hour >= 18 && hour < 23) return "Good evening"
  return "Good night"
}