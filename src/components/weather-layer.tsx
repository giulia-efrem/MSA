import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useState } from "react"
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native"
import Svg, { Circle, Rect } from "react-native-svg"

import type { Weather } from "@/lib/weather"

// Animated weather drawn on top of the sky: drifting clouds, rain, snow, fog and lightning.
// Everything holds still if the phone has Reduce Motion turned on.

// Phones run these animations natively (smooth and battery friendly). The web preview can't.
const NATIVE = Platform.OS !== "web"

// A repeatable "random" number between 0 and 1, so every drop and cloud keeps its own
// spot and speed between screen updates.
function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// A value that goes from 0 to 1 over and over. `start` shifts where in the cycle it begins,
// so drops and clouds don't all move in step.
function useCycle(start: number, duration: number, still: boolean) {
  const [value] = useState(() => new Animated.Value(0))
  const [progress] = useState(() => Animated.modulo(Animated.add(value, start), 1))

  useEffect(() => {
    if (still) {
      value.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: NATIVE }),
    )
    loop.start()
    return () => loop.stop()
  }, [value, duration, still])

  return progress
}

type LayerProps = {
  weather: Weather | null
  width: number
  height: number
  night: boolean
}

export function WeatherLayer({ weather, width, height, night }: LayerProps) {
  const [still, setStill] = useState(false)

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (active) setStill(reduce)
    })
    return () => {
      active = false
    }
  }, [])

  if (!weather || width === 0 || height === 0) return null

  const kind = weather.kind
  const wet = kind === "drizzle" || kind === "rain" || kind === "storm"
  const heavySky = wet || kind === "snow" || kind === "cloudy"
  // Fewer drops and flakes in small areas, like the sky card on the home screen.
  const density = Math.min(1, (width * height) / (390 * 844))
  const drops = wet
    ? Math.max(8, Math.round((kind === "drizzle" ? 26 : 30 + 30 * weather.intensity) * density))
    : 0
  const flakes = kind === "snow" ? Math.max(8, Math.round((20 + 25 * weather.intensity) * density)) : 0
  const clouds =
    kind === "clear" ? 0 : kind === "partly" ? (weather.clouds > 0.3 ? 2 : 1) : kind === "fog" ? 1 : 4

  return (
    <View style={styles.layer}>
      {Array.from({ length: clouds }, (_, i) => (
        <Cloud key={`c${i}`} index={i} width={width} height={height} night={night} grey={heavySky} still={still} />
      ))}
      {kind === "fog" ? (
        <>
          <FogBand index={0} width={width} height={height} still={still} />
          <FogBand index={1} width={width} height={height} still={still} />
        </>
      ) : null}
      {Array.from({ length: drops }, (_, i) => (
        <Drop
          key={`d${i}`}
          index={i}
          width={width}
          height={height}
          still={still}
          drizzle={kind === "drizzle"}
          heavy={weather.intensity > 0.8}
        />
      ))}
      {Array.from({ length: flakes }, (_, i) => (
        <Flake key={`f${i}`} index={i} width={width} height={height} still={still} />
      ))}
      {kind === "storm" ? <Lightning still={still} /> : null}
    </View>
  )
}

type PartProps = { index: number; width: number; height: number; still: boolean }

function Cloud({ index, width, height, night, grey, still }: PartProps & { night: boolean; grey: boolean }) {
  const size = 110 + seeded(index, 1) * 90
  const top = height * (0.04 + seeded(index, 2) * 0.42)
  const drift = useCycle(seeded(index, 4), 70000 + seeded(index, 3) * 60000, still)

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-size, width] })
  const color = night ? "#A7ABD0" : grey ? "#C9CDDB" : "#FFFFFF"
  const opacity = night ? 0.16 : grey ? 0.34 : 0.45

  return (
    <Animated.View
      style={[styles.part, { top, width: size, height: size * 0.5, opacity, transform: [{ translateX }] }]}
    >
      <Svg width={size} height={size * 0.5} viewBox="0 0 100 50">
        <Circle cx={30} cy={30} r={15} fill={color} />
        <Circle cx={50} cy={22} r={20} fill={color} />
        <Circle cx={70} cy={30} r={14} fill={color} />
        <Rect x={14} y={30} width={72} height={16} rx={8} fill={color} />
      </Svg>
    </Animated.View>
  )
}

function Drop({ index, width, height, still, drizzle, heavy }: PartProps & { drizzle: boolean; heavy: boolean }) {
  const x = seeded(index, 6) * (width + 60) - 10
  const fall = useCycle(seeded(index, 5), (drizzle ? 1300 : heavy ? 650 : 900) + seeded(index, 7) * 300, still)

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, height + 10] })
  const translateX = fall.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.15] })

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: x,
          height: drizzle ? 10 : 18,
          opacity: drizzle ? 0.5 : 0.75,
          transform: [{ translateX }, { translateY }, { rotate: "9deg" }],
        },
      ]}
    />
  )
}

function Flake({ index, width, height, still }: PartProps) {
  const x = seeded(index, 8) * width
  const size = 3 + seeded(index, 9) * 3
  const fall = useCycle(seeded(index, 10), 6000 + seeded(index, 11) * 4000, still)

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-10, height + 10] })
  const translateX = fall.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 10, 0, -10, 0],
  })

  return (
    <Animated.View
      style={[
        styles.flake,
        { left: x, width: size, height: size, borderRadius: size, transform: [{ translateX }, { translateY }] },
      ]}
    />
  )
}

function FogBand({ index, width, height, still }: PartProps) {
  const drift = useCycle(index * 0.5, 50000 + index * 20000, still)
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 0.2] })

  return (
    <Animated.View
      style={[
        styles.part,
        { top: height * (0.35 + index * 0.25), width: width * 1.8, height: 90, transform: [{ translateX }] },
      ]}
    >
      <LinearGradient
        colors={["rgba(225,228,245,0)", "rgba(225,228,245,0.22)", "rgba(225,228,245,0)"]}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  )
}

function Lightning({ still }: { still: boolean }) {
  const [flash] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (still) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(5000),
        Animated.timing(flash, { toValue: 0.5, duration: 70, useNativeDriver: NATIVE }),
        Animated.timing(flash, { toValue: 0, duration: 140, useNativeDriver: NATIVE }),
        Animated.timing(flash, { toValue: 0.3, duration: 60, useNativeDriver: NATIVE }),
        Animated.timing(flash, { toValue: 0, duration: 300, useNativeDriver: NATIVE }),
        Animated.delay(3500),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [flash, still])

  return <Animated.View style={[styles.flash, { opacity: flash }]} />
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    pointerEvents: "none",
  },
  part: {
    position: "absolute",
    left: 0,
  },
  drop: {
    position: "absolute",
    top: 0,
    width: 2,
    borderRadius: 1,
    backgroundColor: "#E2EAF8",
  },
  flake: {
    position: "absolute",
    top: 0,
    backgroundColor: "#F4F5FB",
    opacity: 0.85,
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FFFFFF",
  },
})