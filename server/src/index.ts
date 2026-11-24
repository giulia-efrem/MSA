import cors from "cors"
import express, { type NextFunction, type Request, type Response } from "express"
import { networkInterfaces } from "node:os"

import { connectDatabase } from "./db"
import { WakeUp } from "./models"
import { buildStats } from "./stats"

const PORT = 3000
const TASKS = ["math", "memory", "shake", "scan"]

const app = express()
app.use(cors()) // lets the web preview call the API too (the phone app doesn't need it)
app.use(express.json())

// Print every request, so you can watch the app talking to the server.
app.use((req, _res, next) => {
  console.log(`${new Date().toLocaleTimeString()}  ${req.method} ${req.url}`)
  next()
})

// Checks a wake-up sent by the app. Returns a problem message, or null if it's fine.
function checkWakeUp(body: Record<string, unknown>): string | null {
  if (typeof body.deviceId !== "string" || body.deviceId.length === 0 || body.deviceId.length > 100) {
    return "deviceId is missing"
  }
  if (typeof body.finishedAt !== "string" || Number.isNaN(Date.parse(body.finishedAt))) {
    return "finishedAt must be a date"
  }
  if (typeof body.localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.localDate)) {
    return "localDate must look like 2026-11-24"
  }
  if (!Number.isInteger(body.seconds) || (body.seconds as number) < 0 || (body.seconds as number) > 86400) {
    return "seconds must be a whole number"
  }
  if (body.sleep != null && (!Number.isInteger(body.sleep) || (body.sleep as number) < 1 || (body.sleep as number) > 10)) {
    return "sleep must be from 1 to 10"
  }
  if (body.alarmTime != null && (typeof body.alarmTime !== "string" || !/^\d{2}:\d{2}$/.test(body.alarmTime))) {
    return "alarmTime must look like 07:00"
  }
  if (body.task != null && (typeof body.task !== "string" || !TASKS.includes(body.task))) {
    return "task is not a known task"
  }
  return null
}

function deviceIdFrom(req: Request): string | null {
  const id = req.query.deviceId
  return typeof id === "string" && id.length > 0 ? id : null
}

// Is the server running?
app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

// Save a wake-up. Sending the same wake-up again (same phone, same finish time)
// updates it instead, so the app can retry safely and resend it after you grade your sleep.
app.put("/api/wakeups", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>
  const problem = checkWakeUp(body)
  if (problem) {
    res.status(400).json({ error: problem })
    return
  }

  const saved = await WakeUp.findOneAndUpdate(
    { deviceId: body.deviceId as string, finishedAt: new Date(body.finishedAt as string) },
    {
      $set: {
        localDate: body.localDate as string,
        alarmTime: (body.alarmTime as string | null | undefined) ?? null,
        task: (body.task as string | null | undefined) ?? null,
        seconds: body.seconds as number,
        sleep: (body.sleep as number | null | undefined) ?? null,
      },
    },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean()

  res.json(saved)
})

// The latest wake-ups of one phone.
app.get("/api/wakeups", async (req, res) => {
  const deviceId = deviceIdFrom(req)
  if (!deviceId) {
    res.status(400).json({ error: "deviceId is missing" })
    return
  }
  const rows = await WakeUp.find({ deviceId }).sort({ finishedAt: -1 }).limit(50).lean()
  res.json(rows)
})

// Averages, streaks and the last grades of one phone, for the "Your mornings" screen.
app.get("/api/stats", async (req, res) => {
  const deviceId = deviceIdFrom(req)
  if (!deviceId) {
    res.status(400).json({ error: "deviceId is missing" })
    return
  }
  const rows = await WakeUp.find({ deviceId }).sort({ finishedAt: 1 }).lean()
  res.json(buildStats(rows))
})

// Anything unexpected: answer with an error instead of crashing.
app.use((error: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (error.status === 400) {
    res.status(400).json({ error: "The request isn't valid JSON" })
    return
  }
  console.error(error)
  res.status(500).json({ error: "Something went wrong on the server" })
})

// Connect to MongoDB first, then start listening on every network address,
// so phones on the same Wi-Fi can reach the server.
try {
  await connectDatabase()
} catch (error) {
  console.error("Could not connect to MongoDB:", (error as Error).message)
  console.error("Check MONGODB_URI in server/.env, or that MongoDB is running on your laptop.")
  process.exit(1)
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Alarm server running on port ${PORT}`)
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        console.log(`  Phones on your Wi-Fi can reach it at http://${address.address}:${PORT}`)
      }
    }
  }
})
