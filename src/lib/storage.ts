import AsyncStorage from "@react-native-async-storage/async-storage"

import type { Alarm, WakeRecord } from "./types"

// Everything is saved on the phone itself, so the app works without internet.

const ALARMS_KEY = "wake:alarms"
const RECORDS_KEY = "wake:records"

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    console.warn(`Could not read ${key}`, error)
    return fallback
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Could not save ${key}`, error)
  }
}

export const loadAlarms = () => read<Alarm[]>(ALARMS_KEY, [])
export const saveAlarms = (alarms: Alarm[]) => write(ALARMS_KEY, alarms)

export const loadRecords = () => read<WakeRecord[]>(RECORDS_KEY, [])
export const saveRecords = (records: WakeRecord[]) => write(RECORDS_KEY, records)
