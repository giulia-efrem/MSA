import * as Haptics from "expo-haptics"
import { useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"

import { colors, fonts, radius, space } from "@/constants/theme"
import { MEMORY_LENGTH, taskInfo } from "@/lib/tasks"
import type { TaskProps } from "@/lib/types"

const TILES = 9 // a 3 by 3 grid
const LEAD_IN_MS = 900 // pause before the pattern starts
const LIT_MS = 650 // how long each tile stays lit
const GAP_MS = 300 // pause between two tiles
const STEP_MS = LIT_MS + GAP_MS
const FLASH_MS = 220 // how long a tapped tile flashes
const GAP = 14 // space between tiles
const SIDE_PADDING = 48 // the task screen's padding on both sides together
const ACCENT = taskInfo("memory").color

// A random pattern where the same tile never lights up twice in a row.
function makeSequence(length: number): number[] {
  const sequence: number[] = []
  while (sequence.length < length) {
    const tile = Math.floor(Math.random() * TILES)
    if (tile !== sequence[sequence.length - 1]) sequence.push(tile)
  }
  return sequence
}

type Phase = "watch" | "repeat" | "wrong"
type Flash = { tile: number; count: number }

export function MemoryTask({ difficulty, onActivity, onComplete }: TaskProps) {
  // The pattern stays the same after a mistake, so you can try it again.
  const [sequence] = useState(() => makeSequence(MEMORY_LENGTH[difficulty]))
  const [phase, setPhase] = useState<Phase>("watch")
  const [lit, setLit] = useState<number | null>(null)
  const [flash, setFlash] = useState<Flash | null>(null)
  const [position, setPosition] = useState(0)

  // Tile sizes are worked out in pixels from the screen width,
  // because percentage sizes don't lay out reliably on every phone.
  const { width } = useWindowDimensions()
  const gridWidth = Math.min(width - SIDE_PADDING, 360)
  const tileSize = Math.floor((gridWidth - GAP * 2) / 3)

  // Play the pattern, one tile at a time, then hand over to the person.
  useEffect(() => {
    if (phase !== "watch") return
    const timers: ReturnType<typeof setTimeout>[] = []
    sequence.forEach((tile, i) => {
      const start = LEAD_IN_MS + i * STEP_MS
      timers.push(setTimeout(() => setLit(tile), start))
      timers.push(setTimeout(() => setLit(null), start + LIT_MS))
    })
    timers.push(setTimeout(() => setPhase("repeat"), LEAD_IN_MS + sequence.length * STEP_MS))
    return () => timers.forEach(clearTimeout)
  }, [phase, sequence])

  // After a mistake, pause for a moment and replay the same pattern.
  useEffect(() => {
    if (phase !== "wrong") return
    const timer = setTimeout(() => {
      setPosition(0)
      setPhase("watch")
    }, 1200)
    return () => clearTimeout(timer)
  }, [phase])

  // A tapped tile flashes briefly so you can see the tap registered.
  useEffect(() => {
    if (!flash) return
    const timer = setTimeout(() => setFlash(null), FLASH_MS)
    return () => clearTimeout(timer)
  }, [flash])

  function tap(tile: number) {
    if (phase !== "repeat") return
    onActivity()
    setFlash((current) => ({ tile, count: (current?.count ?? 0) + 1 }))

    if (tile !== sequence[position]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setPhase("wrong")
      return
    }

    Haptics.selectionAsync()
    setPosition(position + 1)
    if (position === sequence.length - 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onComplete()
    }
  }

  const status =
    phase === "watch"
      ? "Watch the pattern"
      : phase === "wrong"
        ? "Not quite, watch it again"
        : "Your turn, tap them in the same order"

  // During playback the lit tile glows, during your turn the tapped tile glows.
  const glowing = phase === "watch" ? lit : (flash?.tile ?? null)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.status, phase === "wrong" && styles.statusWrong]}>{status}</Text>
        <View style={styles.progress}>
          {sequence.map((_, i) => (
            <View key={i} style={[styles.dot, i < position && styles.dotDone]} />
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.row}>
            {[0, 1, 2].map((column) => {
              const tile = row * 3 + column
              return (
                <Pressable
                  key={tile}
                  accessibilityRole="button"
                  accessibilityLabel={`Tile ${tile + 1}`}
                  disabled={phase !== "repeat"}
                  onPress={() => tap(tile)}
                  style={({ pressed }) => [
                    styles.tile,
                    { width: tileSize, height: tileSize },
                    (pressed || glowing === tile) &&
                      (phase === "wrong" ? styles.tileWrong : styles.tileLit),
                  ]}
                />
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: space.xl,
  },
  header: {
    alignItems: "center",
    gap: space.md,
  },
  status: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.moon,
    textAlign: "center",
  },
  statusWrong: {
    color: colors.rose,
  },
  progress: {
    flexDirection: "row",
    gap: space.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.haze,
  },
  dotDone: {
    backgroundColor: ACCENT,
  },
  grid: {
    alignSelf: "center",
    gap: GAP,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  tile: {
    borderRadius: radius.md,
    backgroundColor: colors.dusk,
  },
  tileLit: {
    backgroundColor: ACCENT,
  },
  tileWrong: {
    backgroundColor: colors.rose,
  },
})