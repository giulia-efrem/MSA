import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Location from "expo-location"
import { useEffect, useState } from "react"

import type { Coords } from "./sun"

// The phone's position is only used to work out sunrise, sunset and where the
// sun and moon are. It's saved on the phone and never sent anywhere.

const KEY = "wake:coords"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type Saved = Coords & { savedAt: number }

// A rough guess from the time zone, used until (or unless) location is allowed.
// Every hour of time zone is about 15 degrees of longitude.
export function approximateCoords(): Coords {
  const year = new Date().getFullYear()
  const january = new Date(year, 0, 1).getTimezoneOffset()
  const july = new Date(year, 6, 1).getTimezoneOffset()
  const standardOffset = Math.max(january, july) // ignores summer time
  return { latitude: 45, longitude: -standardOffset / 4, approximate: true }
}

async function readSaved(): Promise<Saved | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

async function loadCoords(): Promise<Coords> {
  const saved = await readSaved()
  if (saved && Date.now() - saved.savedAt < WEEK_MS) return saved

  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status === "granted") {
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }))
      const coords: Coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        approximate: false,
      }
      await AsyncStorage.setItem(KEY, JSON.stringify({ ...coords, savedAt: Date.now() }))
      return coords
    }
  } catch (error) {
    console.warn("Could not get the location", error)
  }

  return saved ?? approximateCoords()
}

// Shared by every screen, so the location is only looked up once per app start.
let pending: Promise<Coords> | null = null

export function useCoords(): Coords {
  const [coords, setCoords] = useState<Coords>(() => approximateCoords())

  useEffect(() => {
    let active = true
    if (!pending) pending = loadCoords()
    pending.then((found) => {
      if (active) setCoords(found)
    })
    return () => {
      active = false
    }
  }, [])

  return coords
}