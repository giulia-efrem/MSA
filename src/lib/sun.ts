import * as SunCalc from "suncalc"

import { formatTime } from "./time"

// Where on Earth the phone is. "approximate" means we guessed from the time zone.
export type Coords = { latitude: number; longitude: number; approximate: boolean }

type Palette = readonly [string, string, string, string]

export type SkyState = {
  colors: Palette // sky gradient, from the top of the sky down to the horizon
  stars: number // how visible the stars are, 0 to 1
  sun: { altitude: number; azimuth: number; color: string; glow: string }
  moon: { altitude: number; azimuth: number; fraction: number; waxing: boolean }
}

// What the sky looks like for different heights of the sun (in degrees above the horizon).
// Between two of these, the colors blend smoothly.
const SKY_KEYFRAMES: { altitude: number; colors: Palette }[] = [
  { altitude: -18, colors: ["#090C22", "#0F1336", "#171A40", "#1F2049"] }, // night
  { altitude: -10, colors: ["#0D1130", "#181B46", "#2A2557", "#3B2D5C"] }, // deep twilight
  { altitude: -4, colors: ["#131943", "#29245E", "#55386C", "#93566F"] }, // dawn and dusk
  { altitude: 0, colors: ["#1A2250", "#3B336F", "#9C5E79", "#EC9776"] }, // sunrise and sunset
  { altitude: 6, colors: ["#22336A", "#48548F", "#B98589", "#FBBE8C"] }, // golden hour
  { altitude: 15, colors: ["#1E3E79", "#335F9D", "#6A91C2", "#B5C6DC"] }, // morning
  { altitude: 40, colors: ["#193C7B", "#2B5DA6", "#5587CA", "#98B9DE"] }, // full day
]

// Blends two hex colors. t = 0 gives a, t = 1 gives b.
function mix(a: string, b: string, t: number): string {
  const from = parseInt(a.slice(1), 16)
  const to = parseInt(b.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t)
  return "#" + [16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function skyColors(altitude: number): Palette {
  const first = SKY_KEYFRAMES[0]
  const last = SKY_KEYFRAMES[SKY_KEYFRAMES.length - 1]
  if (altitude <= first.altitude) return first.colors
  if (altitude >= last.altitude) return last.colors
  const i = SKY_KEYFRAMES.findIndex((frame) => altitude <= frame.altitude)
  const a = SKY_KEYFRAMES[i - 1]
  const b = SKY_KEYFRAMES[i]
  const t = (altitude - a.altitude) / (b.altitude - a.altitude)
  return [
    mix(a.colors[0], b.colors[0], t),
    mix(a.colors[1], b.colors[1], t),
    mix(a.colors[2], b.colors[2], t),
    mix(a.colors[3], b.colors[3], t),
  ]
}

// The real sky at a moment and place: colors, stars, and where the sun and moon are.
export function skyAt(date: Date, coords: Coords): SkyState {
  const sun = SunCalc.getPosition(date, coords.latitude, coords.longitude)
  const moon = SunCalc.getMoonPosition(date, coords.latitude, coords.longitude)
  const light = SunCalc.getMoonIllumination(date)
  // The sun is deep orange near the horizon and pale yellow when it's high.
  const height = clamp((sun.altitude - 2) / 25, 0, 1)
  return {
    colors: skyColors(sun.altitude),
    stars: clamp((-sun.altitude - 3) / 9, 0, 1),
    sun: {
      altitude: sun.altitude,
      azimuth: sun.azimuth,
      color: mix("#FFB27A", "#FFF1CC", height),
      glow: mix("#FFC79A", "#FFF6DD", height),
    },
    moon: {
      altitude: moon.altitude,
      azimuth: moon.azimuth,
      fraction: light.fraction,
      waxing: light.waxing,
    },
  }
}

// Sunrise and sunset on the calendar day of `date`. Either can be null near the poles.
export function sunTimes(date: Date, coords: Coords): { sunrise: Date | null; sunset: Date | null } {
  const times = SunCalc.getTimes(
    date,
    coords.latitude,
    coords.longitude,
    0,
    -date.getTimezoneOffset(),
  )
  return { sunrise: times.sunrise, sunset: times.sunset }
}

export function clockTime(date: Date | null): string {
  return date ? formatTime(date.getHours(), date.getMinutes()) : "--:--"
}

function spell(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

// For example "42 min before sunrise" or "1 h 5 min after sunrise".
export function wakeVsSunrise(alarmAt: Date, coords: Coords): string | null {
  const { sunrise } = sunTimes(alarmAt, coords)
  if (!sunrise) return null
  const minutes = Math.round((sunrise.getTime() - alarmAt.getTime()) / 60000)
  if (Math.abs(minutes) <= 5) return "Right at sunrise"
  return minutes > 0 ? `${spell(minutes)} before sunrise` : `${spell(-minutes)} after sunrise`
}

// A short line about the sun right now, for example "Sunrise in 38 min",
// "The sun rose at 06:41", "Sunset at 18:44" or "The sun set at 18:44".
export function sunNote(now: Date, coords: Coords): string | null {
  const { sunrise, sunset } = sunTimes(now, coords)
  if (!sunrise || !sunset) return null
  const toSunrise = Math.round((sunrise.getTime() - now.getTime()) / 60000)
  if (toSunrise > 0) {
    return toSunrise <= 180 ? `Sunrise in ${spell(toSunrise)}` : `Sunrise at ${clockTime(sunrise)}`
  }
  const middayPassed = now.getTime() > (sunrise.getTime() + sunset.getTime()) / 2
  if (!middayPassed) return `The sun rose at ${clockTime(sunrise)}`
  if (now < sunset) return `Sunset at ${clockTime(sunset)}`
  return `The sun set at ${clockTime(sunset)}`
}

// True between midnight and sunrise.
export function beforeSunrise(now: Date, coords: Coords): boolean {
  const { sunrise } = sunTimes(now, coords)
  return sunrise !== null && now < sunrise
}

// Where the sun or moon sits in a picture that faces the equator (south in the
// northern hemisphere), so east is on the left and west on the right.
// x goes from 0 (left edge) to 1 (right edge), the horizon is y = 0.
export function skyPoint(altitude: number, azimuth: number, latitude: number) {
  const facing = latitude >= 0 ? 180 : 0
  const offset = ((((azimuth - facing) % 360) + 540) % 360) - 180
  return {
    x: 0.5 + (clamp(offset, -120, 120) / 240) * 0.84,
    y: clamp(altitude, -20, 70) / 70,
  }
}