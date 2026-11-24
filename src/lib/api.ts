import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"

import { formatTime } from "./time"
import type { Alarm, TaskType, WakeRecord } from "./types"

// Everything that talks to our own backend (the server folder) lives here.
// The phone keeps working without it: wake-ups are saved on the phone first,
// then sent to the server whenever it can be reached.

const PORT = 3000

// Where the server is. While developing, it runs on the same laptop as Expo,
// so we reuse the laptop's address that Expo Go already knows, with port 3000.
// To use another address, put EXPO_PUBLIC_API_URL=http://... in a .env file.
export function serverAddress(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  const host = Constants.expoConfig?.hostUri?.split(":")[0]
  return host ? `http://${host}:${PORT}` : null
}

// A random id for this phone, made once and kept, so the server knows whose data it is.
const DEVICE_KEY = "wake:deviceId"
let deviceIdLoading: Promise<string> | null = null

export function getDeviceId(): Promise<string> {
  if (!deviceIdLoading) {
    deviceIdLoading = (async () => {
      const saved = await AsyncStorage.getItem(DEVICE_KEY)
      if (saved) return saved
      const id = `phone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      await AsyncStorage.setItem(DEVICE_KEY, id)
      return id
    })()
  }
  return deviceIdLoading
}

// Sends one request and gives up after 6 seconds, so the app never hangs on it.
async function request(method: "GET" | "PUT", path: string, body?: unknown): Promise<Response> {
  const base = serverAddress()
  if (!base) throw new Error("No server address")
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    return await fetch(`${base}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

// The phone's calendar day, like "2026-11-24".
function localDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Remembers what each wake-up looked like the last time the server saved it,
// so only new or changed wake-ups (like a new sleep grade) are sent again.
const SYNCED_KEY = "wake:synced"
const fingerprint = (r: WakeRecord) => `${r.seconds}|${r.sleep ?? ""}`

async function syncOnce(records: WakeRecord[], alarms: Alarm[]): Promise<void> {
  if (!serverAddress()) return
  const deviceId = await getDeviceId()
  const synced: Record<string, string> = JSON.parse((await AsyncStorage.getItem(SYNCED_KEY)) ?? "{}")
  let changed = false

  for (const record of records) {
    if (synced[record.finishedAt] === fingerprint(record)) continue
    const alarm = alarms.find((a) => a.id === record.alarmId)
    try {
      const response = await request("PUT", "/api/wakeups", {
        deviceId,
        finishedAt: record.finishedAt,
        localDate: localDate(new Date(record.finishedAt)),
        alarmTime: alarm ? formatTime(alarm.hour, alarm.minute) : null,
        task: alarm?.task ?? null,
        seconds: record.seconds,
        sleep: record.sleep ?? null,
      })
      if (!response.ok) break
    } catch {
      break // the server isn't reachable right now, so try again next time
    }
    synced[record.finishedAt] = fingerprint(record)
    changed = true
  }

  if (changed) await AsyncStorage.setItem(SYNCED_KEY, JSON.stringify(synced))
}

// Sends any new or changed wake-ups to the server. If it's already busy sending,
// it runs once more afterwards with the newest list, so nothing gets skipped.
let running: Promise<void> | null = null
let queued: { records: WakeRecord[]; alarms: Alarm[] } | null = null

export function syncWakeUps(records: WakeRecord[], alarms: Alarm[]): Promise<void> {
  queued = { records, alarms }
  if (!running) {
    running = (async () => {
      while (queued) {
        const next = queued
        queued = null
        await syncOnce(next.records, next.alarms)
      }
      running = null
    })()
  }
  return running
}

// What the server sends back for the "Your mornings" screen.
export type Stats = {
  mornings: number
  wakeUps: number
  averageSleep: number | null
  bestStreak: number
  averageSeconds: number | null
  lastGrades: { date: string; sleep: number }[]
  recent: {
    finishedAt: string
    date: string
    alarmTime: string | null
    task: TaskType | null
    seconds: number
    sleep: number | null
  }[]
}

export async function fetchStats(): Promise<Stats> {
  const deviceId = await getDeviceId()
  const response = await request("GET", `/api/stats?deviceId=${encodeURIComponent(deviceId)}`)
  if (!response.ok) throw new Error(`Server answered ${response.status}`)
  return (await response.json()) as Stats
}