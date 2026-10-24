import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useId, useState } from "react"
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native"
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg"

import { colors, ground, hillFar, sky } from "@/constants/theme"
import { skyPoint, type SkyState } from "@/lib/sun"

type GradientProps = {
  variant?: keyof typeof sky // one of the fixed skies from the theme
  colors?: readonly [string, string, ...string[]] // or any colors, top to horizon
}

// A sky gradient that fills whatever it's placed in.
export function SkyGradient({ variant = "dawn", colors: custom }: GradientProps) {
  return <LinearGradient colors={custom ?? sky[variant]} style={StyleSheet.absoluteFill} />
}

// A handful of fixed stars, positioned in percent so they fit any size.
const STARS = [
  { x: 9, y: 12, size: 2, opacity: 0.9 },
  { x: 22, y: 30, size: 1.5, opacity: 0.5 },
  { x: 38, y: 8, size: 1.5, opacity: 0.7 },
  { x: 55, y: 22, size: 2, opacity: 0.6 },
  { x: 68, y: 6, size: 1.5, opacity: 0.8 },
  { x: 80, y: 18, size: 2.5, opacity: 0.9 },
  { x: 91, y: 34, size: 1.5, opacity: 0.5 },
  { x: 48, y: 40, size: 1.5, opacity: 0.35 },
  { x: 14, y: 46, size: 1.5, opacity: 0.35 },
  { x: 72, y: 44, size: 1.5, opacity: 0.3 },
  { x: 30, y: 18, size: 2, opacity: 0.55 },
]

type StarProps = {
  star: (typeof STARS)[number]
  index: number
  opacity: number
  twinkle: boolean
}

// One star. When twinkle is on, it slowly fades in and out at its own pace.
function Star({ star, index, opacity, twinkle }: StarProps) {
  const [shine] = useState(() => new Animated.Value(1))

  useEffect(() => {
    if (!twinkle) return
    let cancelled = false
    let loop: Animated.CompositeAnimation | null = null
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return
      const duration = 1300 + (index % 4) * 500
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay((index % 5) * 260),
          Animated.timing(shine, { toValue: 0.2, duration, useNativeDriver: true }),
          Animated.timing(shine, { toValue: 1, duration, useNativeDriver: true }),
        ]),
      )
      loop.start()
    })
    return () => {
      cancelled = true
      loop?.stop()
    }
  }, [twinkle, shine, index])

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          borderRadius: star.size,
          opacity: Animated.multiply(shine, star.opacity * opacity),
        },
      ]}
    />
  )
}

export function Stars({ opacity = 1, twinkle = false }: { opacity?: number; twinkle?: boolean }) {
  return (
    <View style={styles.starField}>
      {STARS.map((star, i) => (
        <Star key={i} star={star} index={i} opacity={opacity} twinkle={twinkle} />
      ))}
    </View>
  )
}

// A soft round glow that fades out to nothing at its edge.
function Glow({ size, color, strength }: { size: number; color: string; strength: number }) {
  // Each glow needs its own gradient id, so two glows on one screen don't clash.
  const id = "glow" + useId().replace(/[^a-zA-Z0-9]/g, "")
  return (
    <Svg width={size} height={size} style={styles.glow}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="0.45" stopColor={color} stopOpacity={strength * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  )
}

// The sun, glowing softly. It's orange near the horizon and paler when high.
export function Sun({
  size,
  color = colors.dawn,
  glow = "#FFC79A",
}: {
  size: number
  color?: string
  glow?: string
}) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <Glow size={size * 2.6} color={glow} strength={0.55} />
      <View style={[disc(size), { backgroundColor: color }]} />
    </View>
  )
}

// The moon, showing its real phase: fraction is how much is lit (0 = new, 1 = full).
export function Moon({
  size,
  fraction = 1,
  waxing = true,
}: {
  size: number
  fraction?: number
  waxing?: boolean
}) {
  const r = size / 2
  // The lit part is a half circle plus or minus a half ellipse (the shadow line).
  const shadowWidth = r * Math.abs(1 - 2 * fraction)
  const crescent = fraction < 0.5
  const outerSweep = waxing ? 1 : 0
  const innerSweep = waxing === crescent ? 0 : 1
  const lit = `M ${r} 0 A ${r} ${r} 0 0 ${outerSweep} ${r} ${size} A ${shadowWidth} ${r} 0 0 ${innerSweep} ${r} 0 Z`

  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <Glow size={size * 3} color="#D9D6F2" strength={0.1 + 0.25 * fraction} />
      <Svg width={size} height={size}>
        <Circle cx={r} cy={r} r={r} fill="#2B2E58" opacity={0.6} />
        <Path d={lit} fill="#ECE9F7" />
      </Svg>
    </View>
  )
}

type BodiesProps = {
  sky: SkyState
  latitude: number
  width: number
  horizon: number // y position of the horizon, from the top of the picture
  top: number // the highest y position the sun or moon can reach
  sunSize: number
  moonSize: number
}

// The sun and moon placed where they really are in the sky right now.
// Put this before <Hills> so they set behind the hills.
export function SkyBodies({ sky: state, latitude, width, horizon, top, sunSize, moonSize }: BodiesProps) {
  function place(altitude: number, azimuth: number, size: number) {
    const point = skyPoint(altitude, azimuth, latitude)
    // Above the horizon, use the space up to `top`. Below it, sink quickly behind the hills.
    const rise = altitude >= 0 ? point.y * (horizon - top) : altitude * (size / 6)
    return { left: point.x * width - size / 2, top: horizon - rise - size / 2 }
  }

  return (
    <>
      {state.moon.altitude > -3 ? (
        <View style={[styles.body, place(state.moon.altitude, state.moon.azimuth, moonSize)]}>
          <Moon size={moonSize} fraction={state.moon.fraction} waxing={state.moon.waxing} />
        </View>
      ) : null}
      {state.sun.altitude > -3 ? (
        <View style={[styles.body, place(state.sun.altitude, state.sun.azimuth, sunSize)]}>
          <Sun size={sunSize} color={state.sun.color} glow={state.sun.glow} />
        </View>
      ) : null}
    </>
  )
}

// Two layers of rolling hills. The front layer is the same color as the ground,
// so the hills flow straight into whatever ground sits below them.
export function Hills({ height }: { height: number }) {
  return (
    <Svg width="100%" height={height} viewBox="0 0 400 100" preserveAspectRatio="none">
      <Path
        d="M0 48 C 40 30 85 24 130 36 C 172 47 205 20 255 16 C 305 12 345 40 400 28 L 400 100 L 0 100 Z"
        fill={hillFar}
      />
      <Path
        d="M0 72 C 55 52 105 60 160 68 C 215 76 255 50 310 52 C 352 54 380 68 400 62 L 400 100 L 0 100 Z"
        fill={ground}
      />
    </Svg>
  )
}

const disc = (diameter: number) => ({
  width: diameter,
  height: diameter,
  borderRadius: diameter / 2,
})

const styles = StyleSheet.create({
  starField: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
  },
  star: {
    position: "absolute",
    backgroundColor: colors.moon,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
  },
  body: {
    position: "absolute",
  },
})