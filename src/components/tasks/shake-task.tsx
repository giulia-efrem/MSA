import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { Accelerometer } from "expo-sensors"
import { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui"
import { colors, fonts, radius, space } from "@/constants/theme"
import { SHAKE_TARGET, taskInfo } from "@/lib/tasks"
import type { TaskProps } from "@/lib/types"

// How strong a movement has to be to count as a shake (1 = gravity at rest).
const FORCE_THRESHOLD = 1.8
// Minimum gap between two counted shakes, so one shake isn't counted twice.
const MIN_GAP_MS = 220
const ACCENT = taskInfo("shake").color

export function ShakeTask({ difficulty, onActivity, onComplete }: TaskProps) {
  const target = SHAKE_TARGET[difficulty]
  const [count, setCount] = useState(0)
  const [sensorAvailable, setSensorAvailable] = useState<boolean | null>(null)

  // Keep the latest callbacks in a ref so the sensor listener always calls the current ones.
  const callbacks = useRef({ onActivity, onComplete })
  useEffect(() => {
    callbacks.current = { onActivity, onComplete }
  })

  useEffect(() => {
    let cancelled = false
    let subscription: { remove: () => void } | null = null
    let shakes = 0
    let lastShake = 0

    Accelerometer.isAvailableAsync().then((available) => {
      if (cancelled) return
      setSensorAvailable(available)
      if (!available) return

      Accelerometer.setUpdateInterval(50)
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        if (shakes >= target) return
        const force = Math.sqrt(x * x + y * y + z * z)
        const now = Date.now()
        if (force < FORCE_THRESHOLD || now - lastShake < MIN_GAP_MS) return

        lastShake = now
        shakes += 1
        setCount(shakes)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        callbacks.current.onActivity()
        if (shakes >= target) callbacks.current.onComplete()
      })
    })

    return () => {
      cancelled = true
      subscription?.remove()
    }
  }, [target])

  // Only used on devices without a motion sensor (like some emulators).
  function countByTap() {
    const next = count + 1
    setCount(next)
    onActivity()
    if (next >= target) onComplete()
  }

  const progress = Math.min(count / target, 1)

  return (
    <View style={styles.container}>
      <Ionicons name="phone-portrait-outline" size={44} color={ACCENT} />
      <View style={styles.counter}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.of}>of {target} shakes</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.hint}>Hold your phone tight and shake it hard.</Text>
      {sensorAvailable === false ? (
        <Button
          label="No motion sensor, tap to count"
          variant="secondary"
          onPress={countByTap}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: space.lg,
  },
  counter: {
    alignItems: "center",
  },
  count: {
    fontFamily: fonts.light,
    fontSize: 96,
    lineHeight: 108,
    color: colors.moon,
    fontVariant: ["tabular-nums"],
  },
  of: {
    fontSize: 16,
    color: colors.mist,
  },
  track: {
    width: "100%",
    height: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.dusk,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: ACCENT,
  },
  hint: {
    fontSize: 15,
    color: colors.mist,
    textAlign: "center",
  },
})