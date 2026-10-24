import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useId, useState } from "react"
import { AccessibilityInfo, Animated, StyleSheet, View } from "react-native"
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg"

import { colors, ground, hillFar, sky } from "@/constants/theme"

// A sky gradient that fills whatever it's placed in.
export function SkyGradient({ variant }: { variant: keyof typeof sky }) {
  return <LinearGradient colors={sky[variant]} style={StyleSheet.absoluteFill} />
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

// The sun, glowing softly.
export function Sun({ size }: { size: number }) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <Glow size={size * 2.6} color="#FFC79A" strength={0.55} />
      <View style={[styles.sun, disc(size)]} />
    </View>
  )
}

// The moon, for nights with no alarm on.
export function Moon({ size }: { size: number }) {
  return (
    <View style={[styles.centerBox, { width: size, height: size }]}>
      <Glow size={size * 3} color="#D9D6F2" strength={0.3} />
      <View style={[styles.moon, disc(size)]} />
    </View>
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
  sun: {
    backgroundColor: colors.dawn,
  },
  moon: {
    backgroundColor: "#ECE9F7",
  },
})