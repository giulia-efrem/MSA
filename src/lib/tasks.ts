import type { Ionicons } from "@expo/vector-icons"
import type { ComponentProps } from "react"

import type { Difficulty, TaskType } from "./types"

type IconName = ComponentProps<typeof Ionicons>["name"]

export type TaskInfo = {
  type: TaskType
  title: string
  description: string
  icon: IconName
  color: string // each task has its own color from the sunrise sky
}

export const TASKS: TaskInfo[] = [
  {
    type: "math",
    title: "Math",
    description: "Solve a few sums to switch your brain on",
    icon: "calculator-outline",
    color: "#FFB27A",
  },
  {
    type: "memory",
    title: "Memory",
    description: "Repeat a pattern of glowing tiles",
    icon: "grid-outline",
    color: "#B9A8FF",
  },
  {
    type: "shake",
    title: "Shake",
    description: "Shake your phone until the bar fills up",
    icon: "phone-portrait-outline",
    color: "#F7A6C8",
  },
  {
    type: "scan",
    title: "Scan a code",
    description: "Walk to a code you registered and scan it",
    icon: "qr-code-outline",
    color: "#8CC8FF",
  },
]

export function taskInfo(type: TaskType): TaskInfo {
  return TASKS.find((task) => task.type === type) ?? TASKS[0]
}

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
]

// How hard each task is at each difficulty. Tweak these numbers freely.
export const MATH_PROBLEMS: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 3 }
export const MEMORY_LENGTH: Record<Difficulty, number> = { easy: 4, medium: 5, hard: 7 }
export const SHAKE_TARGET: Record<Difficulty, number> = { easy: 20, medium: 40, hard: 60 }

// If the person stops making progress for this many seconds, the alarm comes back.
// Scanning gets longer because you have to walk to the code first.
export const IDLE_SECONDS: Record<TaskType, number> = {
  math: 30,
  memory: 30,
  shake: 20,
  scan: 120,
}

export function difficultyHint(task: TaskType, difficulty: Difficulty): string {
  switch (task) {
    case "math":
      return difficulty === "hard"
        ? `${MATH_PROBLEMS.hard} sums with multiplication`
        : `${MATH_PROBLEMS[difficulty]} addition sums`
    case "memory":
      return `A pattern of ${MEMORY_LENGTH[difficulty]} tiles`
    case "shake":
      return `${SHAKE_TARGET[difficulty]} shakes`
    case "scan":
      return "Difficulty doesn’t change scanning, the walk is the hard part"
  }
}