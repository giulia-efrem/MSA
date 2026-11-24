// Turns a phone's wake-ups into the numbers the "Your mornings" screen shows.

type Row = {
  finishedAt: Date
  localDate: string
  alarmTime?: string | null
  task?: string | null
  seconds: number
  sleep?: number | null
}

const average = (values: number[]): number | null =>
  values.length === 0 ? null : Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10

// "2026-11-24" -> "2026-11-25"
function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// rows must be sorted from oldest to newest
export function buildStats(rows: Row[]) {
  const graded = rows.filter((r) => typeof r.sleep === "number")
  const days = [...new Set(rows.map((r) => r.localDate))].sort()

  // The longest run of days in a row with at least one wake-up.
  let bestStreak = 0
  let run = 0
  let previous: string | null = null
  for (const day of days) {
    run = previous !== null && nextDay(previous) === day ? run + 1 : 1
    bestStreak = Math.max(bestStreak, run)
    previous = day
  }

  const averageSeconds = average(rows.map((r) => r.seconds))

  return {
    mornings: days.length,
    wakeUps: rows.length,
    averageSleep: average(graded.slice(-7).map((r) => r.sleep as number)),
    bestStreak,
    averageSeconds: averageSeconds === null ? null : Math.round(averageSeconds),
    lastGrades: graded.slice(-7).map((r) => ({ date: r.localDate, sleep: r.sleep as number })),
    recent: rows
      .slice(-15)
      .reverse()
      .map((r) => ({
        finishedAt: r.finishedAt.toISOString(),
        date: r.localDate,
        alarmTime: r.alarmTime ?? null,
        task: r.task ?? null,
        seconds: r.seconds,
        sleep: r.sleep ?? null,
      })),
  }
}
