export type TaskType = "math" | "memory" | "shake" | "scan"

export type Difficulty = "easy" | "medium" | "hard"

export type Alarm = {
  id: string
  hour: number // 0 to 23
  minute: number // 0 to 59
  label: string
  days: number[] // 0 = Sunday ... 6 = Saturday. Empty means it rings once.
  enabled: boolean
  task: TaskType
  difficulty: Difficulty
  scanCode?: string // the QR code or barcode that stops this alarm
  wakeCheck: boolean // ask again a few minutes later if you're still up
}

export type WakeRecord = {
  alarmId: string
  finishedAt: string // ISO date string
  seconds: number // time from the alarm starting to the task being done
  sleep?: number // how you graded your sleep, 1 to 10 (empty if you skipped it)
}

// Every task screen receives these props from the ringing screen.
export type TaskProps = {
  difficulty: Difficulty
  onActivity: () => void // call whenever the person makes progress
  onComplete: () => void // call once when the task is finished
}