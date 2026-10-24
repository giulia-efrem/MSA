import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { syncAlarms } from "./alarm-service"
import { loadAlarms, loadRecords, saveAlarms, saveRecords } from "./storage"
import type { Alarm, WakeRecord } from "./types"

// Holds the alarms and wake-up history so every screen can read and change them.

type AlarmsContextValue = {
  ready: boolean
  alarms: Alarm[]
  records: WakeRecord[]
  saveAlarm: (alarm: Alarm) => void
  deleteAlarm: (id: string) => void
  setEnabled: (id: string, enabled: boolean) => void
  addRecord: (record: WakeRecord) => void
  gradeSleep: (finishedAt: string, grade: number) => void
}

const AlarmsContext = createContext<AlarmsContextValue | null>(null)

const byTime = (a: Alarm, b: Alarm) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)

export function newAlarmId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function AlarmsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [alarms, setAlarms] = useState<Alarm[]>([])
  const [records, setRecords] = useState<WakeRecord[]>([])

  // Load saved data once when the app starts.
  useEffect(() => {
    Promise.all([loadAlarms(), loadRecords()]).then(([savedAlarms, savedRecords]) => {
      setAlarms(savedAlarms)
      setRecords(savedRecords)
      setReady(true)
    })
  }, [])

  // Whenever alarms change: save them and tell the phone's alarm system.
  useEffect(() => {
    if (!ready) return
    saveAlarms(alarms)
    syncAlarms(alarms)
  }, [alarms, ready])

  useEffect(() => {
    if (!ready) return
    saveRecords(records)
  }, [records, ready])

  const value: AlarmsContextValue = {
    ready,
    alarms,
    records,
    saveAlarm: (alarm) =>
      setAlarms((current) => [...current.filter((a) => a.id !== alarm.id), alarm].sort(byTime)),
    deleteAlarm: (id) => setAlarms((current) => current.filter((a) => a.id !== id)),
    setEnabled: (id, enabled) =>
      setAlarms((current) => current.map((a) => (a.id === id ? { ...a, enabled } : a))),
    // Keep the last 200 wake-ups, which is plenty for streaks and averages.
    addRecord: (record) => setRecords((current) => [...current, record].slice(-200)),
    // Saves the 1 to 10 sleep grade you picked for one wake-up.
    gradeSleep: (finishedAt, grade) =>
      setRecords((current) =>
        current.map((r) => (r.finishedAt === finishedAt ? { ...r, sleep: grade } : r)),
      ),
  }

  return <AlarmsContext.Provider value={value}>{children}</AlarmsContext.Provider>
}

export function useAlarms(): AlarmsContextValue {
  const context = useContext(AlarmsContext)
  if (!context) throw new Error("useAlarms must be used inside AlarmsProvider")
  return context
}