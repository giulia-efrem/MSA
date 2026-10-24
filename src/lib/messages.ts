import AsyncStorage from "@react-native-async-storage/async-storage"

import type { Weather } from "./weather"

// The little message on the "You're up" screen. It depends on what time the alarm
// was set for, plus a few special moments, and never repeats the last one.

const BY_ALARM_TIME: { until: number; messages: string[] }[] = [
  {
    until: 5 * 60, // before 5:00
    messages: [
      "Up before the birds even thought about it. Respect.",
      "The night shift of mornings, and you made it.",
      "Most people are deep in dreams right now. Not you.",
      "That was a brave alarm. Proud of you.",
    ],
  },
  {
    until: 6 * 60 + 30, // 5:00 to 6:29
    messages: [
      "Early bird mode: on.",
      "The world is still asleep and you’re already winning.",
      "Quiet streets, fresh air, a whole head start. Nice.",
      "Early mornings belong to people like you.",
    ],
  },
  {
    until: 8 * 60, // 6:30 to 7:59
    messages: [
      "Right on time. Coffee’s calling.",
      "Good morning! Today’s off to a solid start.",
      "Up and running. Let’s make it a good one.",
      "Alarm defeated. Breakfast is next.",
    ],
  },
  {
    until: 9 * 60 + 30, // 8:00 to 9:29
    messages: [
      "A calm start to the day. Love that.",
      "Good morning! Slow and steady works too.",
      "You’re up. Time for something warm to drink.",
      "Rested and ready. That’s the way.",
    ],
  },
  {
    until: 12 * 60, // 9:30 to 11:59
    messages: [
      "A slow morning is still a morning.",
      "Well rested looks good on you.",
      "Late start, zero judgment. Enjoy the day.",
      "The sun’s been waiting for you.",
    ],
  },
  {
    until: 24 * 60, // noon and later
    messages: [
      "Good afternoon, sleepyhead!",
      "A nap well taken. Back to it.",
      "Rise and shine, whatever time it is.",
      "Recharged and ready for the rest of the day.",
    ],
  },
]

const BEFORE_SUNRISE = [
  "You beat the sun today.",
  "Up before the sunrise. That’s a superpower.",
  "Even the sun is still in bed.",
]
const WEEKEND = ["Up on a weekend? Look at you go.", "Weekend mornings hit different. Enjoy it."]
const FAST = ["That was fast. Were you even asleep?", "Speedrun complete."]
const MILESTONES: Record<number, string> = {
  3: "Three mornings in a row. A streak is born!",
  7: "A whole week of mornings. Unstoppable.",
  14: "Two weeks strong. This is a habit now.",
  30: "30 mornings in a row. Legendary.",
  50: "50 mornings! Honestly, teach us your ways.",
  100: "100 mornings in a row. Hall of fame.",
}

function weatherMessages(weather: Weather | null): string[] {
  if (!weather) return []
  const t = Math.round(weather.temperature)
  const list: string[] = []
  if (weather.kind === "rain" || weather.kind === "drizzle") {
    list.push("Rainy one out there. Grab an umbrella.", "Rain outside, cozy vibes inside.")
  }
  if (weather.kind === "storm") list.push("Thunderstorms around. Maybe a cozy indoor plan?")
  if (weather.kind === "snow") list.push("It’s snowing! Dress warm out there.")
  if (weather.kind === "fog") list.push("Foggy morning. Take it slow out there.")
  if (weather.kind === "clear") list.push("Clear skies today. Good day to be up.")
  if (t <= 3) list.push(`It’s ${t}° outside. Coat, scarf, the works.`)
  if (t >= 27) list.push(`Already ${t}° out there. Stay cool and drink water.`)
  return list
}

type MessageInput = {
  hour: number // when the alarm was set to ring
  minute: number
  beforeSunrise: boolean
  weekend: boolean
  streak: number
  seconds: number
  weather: Weather | null
}

const LAST_KEY = "wake:lastMessage"

// Picks a message and remembers it, so the next one is different.
export async function pickWakeMessage(input: MessageInput): Promise<string> {
  let last: string | null = null
  try {
    last = await AsyncStorage.getItem(LAST_KEY)
  } catch {
    last = null
  }

  const milestone = MILESTONES[input.streak]
  let message: string
  if (milestone && milestone !== last) {
    message = milestone
  } else {
    const minutes = input.hour * 60 + input.minute
    const band = BY_ALARM_TIME.find((b) => minutes < b.until) ?? BY_ALARM_TIME[BY_ALARM_TIME.length - 1]
    const options = [
      ...band.messages,
      ...(input.beforeSunrise ? BEFORE_SUNRISE : []),
      ...(input.weekend ? WEEKEND : []),
      ...(input.seconds < 45 ? FAST : []),
      ...weatherMessages(input.weather),
    ].filter((m) => m !== last)
    message = options[Math.floor(Math.random() * options.length)]
  }

  AsyncStorage.setItem(LAST_KEY, message).catch(() => {})
  return message
}