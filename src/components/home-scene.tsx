import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useState } from "react"
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Circle, Defs, Ellipse, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg"

import { SkyBodies, SkyGradient, Stars } from "@/components/sky"
import { WeatherLayer } from "@/components/weather-layer"
import type { Coords, SkyState } from "@/lib/sun"
import { greySky, weatherMood, type Weather } from "@/lib/weather"

// The scene at the top of the home screen: the real sky, the weather, and a little
// landscape with a cabin whose window lights up in the evening.

const NATIVE = Platform.OS !== "web"

// The landscape is drawn on a 400 by 300 canvas and scaled to cover the bottom of the scene.
const ART_W = 400
const ART_H = 300
const HORIZON_Y = 112 // where the far hills meet the sky, on that canvas

type Props = {
  sky: SkyState
  weather: Weather | null
  coords: Coords
  width: number
  height: number
  skyTop: number // the highest the sun or moon can go, from the top of the scene
  groundColor: string // the front ground, so it can blend into whatever is below the scene
  active: boolean // false while another screen is open, to pause the animations
}

export function HomeScene({ sky, weather, coords, width, height, skyTop, groundColor, active }: Props) {
  const insets = useSafeAreaInsets()
  const [still, setStill] = useState(false)
  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (mounted) setStill(reduce)
    })
    return () => {
      mounted = false
    }
  }, [])

  if (width === 0 || height === 0) return null

  const mood = weatherMood(weather)
  const night = sky.sun.altitude < -4
  const landHeight = Math.round(height * 0.42)
  const scale = Math.max(width / ART_W, landHeight / ART_H)
  const artLeft = (width - ART_W * scale) / 2
  const artTop = height - ART_H * scale
  const horizon = artTop + HORIZON_Y * scale
  const snowy = weather?.kind === "snow"
  const windowLit = sky.sun.altitude < 3 // lights on from dusk until after sunrise
  const smoky = windowLit || (weather !== null && weather.temperature < 8)
  // Weather starts below the greeting, so clouds never drift behind it.
  const weatherTop = insets.top + 76

  return (
    <View style={styles.fill}>
      <SkyGradient colors={greySky(sky.colors, mood.grey)} />
      <Stars opacity={sky.stars * mood.stars} twinkle={active} />
      <View style={[styles.fill, { opacity: mood.bodies }]}>
        <SkyBodies
          sky={sky}
          latitude={coords.latitude}
          width={width}
          horizon={horizon}
          top={skyTop}
          sunSize={62}
          moonSize={36}
        />
      </View>

      <Svg
        width={ART_W * scale}
        height={ART_H * scale}
        viewBox={`0 0 ${ART_W} ${ART_H}`}
        style={{ position: "absolute", left: artLeft, top: artTop }}
      >
        <Defs>
          <RadialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFB86E" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFB86E" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Landscape lit={windowLit} snowy={snowy} groundColor={groundColor} />
      </Svg>

      {smoky ? (
        <Smoke
          x={artLeft + 303 * scale}
          y={artTop + 133 * scale}
          size={6 * scale}
          rise={34 * scale}
          still={still || !active}
        />
      ) : null}

      {active ? (
        <View style={[styles.weather, { top: weatherTop }]}>
          <WeatherLayer weather={weather} width={width} height={height - weatherTop} night={night} />
        </View>
      ) : null}

      {/* Softly darkens the top of the sky so the text on it stays easy to read */}
      <LinearGradient
        colors={["rgba(9, 11, 28, 0.45)", "rgba(9, 11, 28, 0.15)", "rgba(9, 11, 28, 0)"]}
        locations={[0, 0.45, 0.7]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  )
}

// A pine tree made of two triangles, standing at (x, y) and h units tall.
function Pine({ x, y, h, color, snowy }: { x: number; y: number; h: number; color: string; snowy: boolean }) {
  const top = `${x},${y - h} ${x - h * 0.26},${y - h * 0.42} ${x + h * 0.26},${y - h * 0.42}`
  const bottom = `${x},${y - h * 0.72} ${x - h * 0.36},${y - h * 0.08} ${x + h * 0.36},${y - h * 0.08}`
  return (
    <>
      <Rect x={x - h * 0.04} y={y - h * 0.12} width={h * 0.08} height={h * 0.12} fill={color} />
      <Polygon points={bottom} fill={color} />
      <Polygon points={top} fill={color} />
      {snowy ? (
        <Polygon
          points={`${x},${y - h} ${x - h * 0.12},${y - h * 0.8} ${x + h * 0.12},${y - h * 0.8}`}
          fill="#E6E9F5"
        />
      ) : null}
    </>
  )
}

function Landscape({ lit, snowy, groundColor }: { lit: boolean; snowy: boolean; groundColor: string }) {
  return (
    <>
      {/* far hills */}
      <Path
        d="M0 132 C 50 108 100 100 150 112 C 200 124 240 96 300 92 C 350 88 380 110 400 104 L400 300 L0 300 Z"
        fill="#272150"
      />
      <Pine x={34} y={122} h={18} color="#211C47" snowy={snowy} />
      <Pine x={50} y={118} h={22} color="#211C47" snowy={snowy} />
      <Pine x={336} y={96} h={20} color="#211C47" snowy={snowy} />
      <Pine x={354} y={100} h={16} color="#211C47" snowy={snowy} />

      {/* middle hill with the cabin */}
      <Path
        d="M0 190 C 60 166 130 164 190 176 C 240 186 262 158 316 156 C 360 154 385 166 400 164 L400 300 L0 300 Z"
        fill="#1A1840"
      />
      <Pine x={64} y={180} h={30} color="#13123A" snowy={snowy} />
      <Pine x={86} y={176} h={38} color="#13123A" snowy={snowy} />
      <Pine x={206} y={180} h={28} color="#13123A" snowy={snowy} />
      <Pine x={372} y={164} h={34} color="#13123A" snowy={snowy} />

      {/* the cabin */}
      {lit ? <Circle cx={285} cy={164} r={30} fill="url(#windowGlow)" /> : null}
      <Rect x={270} y={152} width={44} height={26} fill="#282150" />
      <Rect x={300} y={134} width={7} height={14} fill="#282150" />
      <Polygon points="263,154 292,133 321,154" fill="#3A2E60" />
      {snowy ? <Path d="M261 155 L292 131 L323 155 L318 156 L292 136 L266 156 Z" fill="#E6E9F5" /> : null}
      <Rect x={280} y={160} width={11} height={9} rx={1} fill={lit ? "#FFC47E" : "#3A376A"} />
      <Rect x={298} y={161} width={9} height={17} rx={1} fill="#1C183A" />

      {/* front ground */}
      <Path
        d="M0 246 C 70 230 150 234 220 242 C 290 250 340 236 400 234 L400 300 L0 300 Z"
        fill={groundColor}
      />
      <Pine x={22} y={250} h={52} color="#0A0B1E" snowy={snowy} />
      <Pine x={48} y={244} h={40} color="#0A0B1E" snowy={snowy} />
      <Pine x={366} y={240} h={48} color="#0A0B1E" snowy={snowy} />
      {snowy ? (
        <>
          <Ellipse cx={120} cy={178} rx={30} ry={3} fill="#DDE1F0" opacity={0.4} />
          <Ellipse cx={236} cy={182} rx={22} ry={3} fill="#DDE1F0" opacity={0.4} />
          <Ellipse cx={92} cy={250} rx={40} ry={4} fill="#DDE1F0" opacity={0.35} />
          <Ellipse cx={200} cy={247} rx={52} ry={4} fill="#DDE1F0" opacity={0.35} />
          <Ellipse cx={318} cy={246} rx={36} ry={4} fill="#DDE1F0" opacity={0.35} />
        </>
      ) : null}
    </>
  )
}

// Soft puffs of smoke drifting up from the chimney.
function Smoke({ x, y, size, rise, still }: { x: number; y: number; size: number; rise: number; still: boolean }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Puff key={i} index={i} x={x} y={y} size={size} rise={rise} still={still} />
      ))}
    </>
  )
}

function Puff({ index, x, y, size, rise, still }: { index: number; x: number; y: number; size: number; rise: number; still: boolean }) {
  const [value] = useState(() => new Animated.Value(0))
  const [progress] = useState(() => Animated.modulo(Animated.add(value, index / 3), 1))

  useEffect(() => {
    if (still) {
      value.setValue(0)
      return
    }
    const loop = Animated.loop(
      Animated.timing(value, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: NATIVE }),
    )
    loop.start()
    return () => loop.stop()
  }, [value, still])

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] })
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, rise * 0.35] })
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] })
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] })

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: "#CDD0E4",
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  )
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "none",
  },
  weather: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
})