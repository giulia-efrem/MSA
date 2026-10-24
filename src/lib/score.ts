import type { WakeRecord } from "./types"

// Your own 1 to 10 grade for how you slept, picked on the "You're up" screen.

export function gradeWord(grade: number): string {
  if (grade >= 10) return "Perfect sleep"
  if (grade >= 8) return "Great night"
  if (grade >= 6) return "Good night"
  if (grade >= 4) return "Okay night"
  return "Rough night"
}

// A little reply after you pick your grade.
export function gradeReply(grade: number): string {
  if (grade >= 10) return "Perfect sleep. Today is yours."
  if (grade >= 8) return "Nicely rested. Go get it."
  if (grade >= 6) return "Pretty decent. Let’s make it a good day."
  if (grade >= 4) return "Not your best night. An early bedtime could help."
  return "Rough night. Be gentle with yourself today."
}

// Average grade of the last 7 graded mornings, like 7.4. Null if there are none yet.
export function averageSleep(records: WakeRecord[]): number | null {
  const grades = records
    .filter((r) => typeof r.sleep === "number")
    .slice(-7)
    .map((r) => r.sleep as number)
  if (grades.length === 0) return null
  return Math.round((grades.reduce((sum, g) => sum + g, 0) / grades.length) * 10) / 10
}