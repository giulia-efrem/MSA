import type { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useEffect, useState, type ComponentProps } from "react"

import type { Coords } from "./sun"

// Live weather from Open-Meteo (open-meteo.com): free for non-commercial use,
// no account and no API key needed.

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm"

export type Weather = {
  kind: WeatherKind
  label: string // for example "Light rain"
  temperature: number // degrees Celsius
  clouds: number // cloud cover from 0 to 1
  intensity: number // how strong the rain or snow is, from 0 to 1
  latitude: number
  longitude: number
  fetchedAt: number
}

type IconName = ComponentProps<typeof Ionicons>["name"]

// Weather codes are the international WMO codes that Open-Meteo returns.
function describe(code: number): { kind: WeatherKind; label: string; intensity: number } {
  if (code === 0) return { kind: "clear", label: "Clear", intensity: 0 }
  if (code === 1) return { kind: "partly", label: "Mostly clear", intensity: 0 }
  if (code === 2) return { kind: "partly", label: "Partly cloudy", intensity: 0 }
  if (code === 3) return { kind: "cloudy", label: "Overcast", intensity: 0 }
  if (code === 45 || code === 48) return { kind: "fog", label: "Fog", intensity: 0 }
  if (code >= 51 && code <= 57) return { kind: "drizzle", label: "Drizzle", intensity: 0.3 }
  if (code === 61 || code === 80) return { kind: "rain", label: "Light rain", intensity: 0.45 }
  if (code === 63 || code === 66 || code === 81) return { kind: "rain", label: "Rain", intensity: 0.7 }
  if (code === 65 || code === 67 || code === 82) return { kind: "rain", label: "Heavy rain", intensity: 1 }
  if (code === 71 || code === 85) return { kind: "snow", label: "Light snow", intensity: 0.45 }
  if (code === 73 || code === 77) return { kind: "snow", label: "Snow", intensity: 0.7 }
  if (code === 75 || code === 86) return { kind: "snow", label: "Heavy snow", intensity: 1 }
  if (code >= 95) return { kind: "storm", label: "Thunderstorm", intensity: 1 }
  return { kind: "cloudy", label: "Cloudy", intensity: 0 }
}

export function weatherIcon(weather: Weather, night: boolean): IconName {
  switch (weather.kind) {
    case "clear":
      return night ? "moon" : "sunny"
    case "partly":
      return night ? "cloudy-night" : "partly-sunny"
    case "cloudy":
    case "fog":
      return "cloudy"
    case "drizzle":
    case "rain":
      return "rainy"
    case "snow":
      return "snow"
    case "storm":
      return "thunderstorm"
  }
}

// How much the weather greys out the sky, hides the stars, and dims the sun and moon.
export function weatherMood(weather: Weather | null): { grey: number; stars: number; bodies: number } {
  if (!weather) return { grey: 0, stars: 1, bodies: 1 }
  const grey: Record<WeatherKind, number> = {
    clear: 0,
    partly: 0.12,
    cloudy: 0.5 * weather.clouds,
    fog: 0.5,
    drizzle: 0.45,
    rain: 0.55,
    snow: 0.45,
    storm: 0.7,
  }
  const covered = weather.kind === "partly" ? weather.clouds * 0.4 : weather.clouds
  return {
    grey: grey[weather.kind],
    stars: 1 - covered,
    bodies: weather.kind === "clear" ? 1 : 1 - covered * 0.75,
  }
}

// Turns sky colors greyer and a little darker, like on a cloudy day.
export function greySky<T extends readonly string[]>(colors: T, amount: number): T {
  if (amount <= 0) return colors
  return colors.map((hex) => {
    const n = parseInt(hex.slice(1), 16)
    const r = (n >> 16) & 255
    const g = (n >> 8) & 255
    const b = n & 255
    const grey = (0.3 * r + 0.59 * g + 0.11 * b) * 0.8
    const toward = (c: number) => Math.round(c + (grey - c) * amount)
    return "#" + [toward(r), toward(g), toward(b)].map((c) => c.toString(16).padStart(2, "0")).join("")
  }) as unknown as T
}

const KEY = "wake:weather"
const MAX_AGE_MS = 30 * 60 * 1000 // fetch fresh weather every 30 minutes
const STALE_OK_MS = 6 * 60 * 60 * 1000 // if offline, old weather is fine for 6 hours

const near = (w: Weather, coords: Coords) =>
  Math.abs(w.latitude - coords.latitude) < 0.1 && Math.abs(w.longitude - coords.longitude) < 0.1

async function fetchWeather(coords: Coords): Promise<Weather | null> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${coords.latitude.toFixed(3)}&longitude=${coords.longitude.toFixed(3)}` +
    "&current=temperature_2m,weather_code,cloud_cover"
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) return null
    const data = await response.json()
    const current = data.current
    const { kind, label, intensity } = describe(current.weather_code)
    return {
      kind,
      label,
      intensity,
      temperature: current.temperature_2m,
      clouds: Math.min(1, Math.max(0, current.cloud_cover / 100)),
      latitude: coords.latitude,
      longitude: coords.longitude,
      fetchedAt: Date.now(),
    }
  } catch {
    return null // no internet or the service is down: just show the sky without weather
  } finally {
    clearTimeout(timer)
  }
}

let memory: Weather | null = null

async function loadWeather(coords: Coords): Promise<Weather | null> {
  if (!memory) {
    try {
      const raw = await AsyncStorage.getItem(KEY)
      memory = raw ? (JSON.parse(raw) as Weather) : null
    } catch {
      memory = null
    }
  }
  const cached = memory && near(memory, coords) ? memory : null
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) return cached

  const fresh = await fetchWeather(coords)
  if (fresh) {
    memory = fresh
    AsyncStorage.setItem(KEY, JSON.stringify(fresh)).catch(() => {})
    return fresh
  }
  return cached && Date.now() - cached.fetchedAt < STALE_OK_MS ? cached : null
}

// The current weather where the phone is, refreshed every 30 minutes.
// Returns null when the location is only a guess, so it never shows the wrong city's weather.
export function useWeather(coords: Coords): Weather | null {
  const [weather, setWeather] = useState<Weather | null>(null)

  useEffect(() => {
    if (coords.approximate) return
    let active = true
    const refresh = () =>
      loadWeather(coords).then((found) => {
        if (active) setWeather(found)
      })
    refresh()
    const timer = setInterval(refresh, MAX_AGE_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [coords])

  return coords.approximate ? null : weather
}