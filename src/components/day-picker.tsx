import * as Haptics from "expo-haptics"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, fonts, radius } from "@/constants/theme"
import { WEEK } from "@/lib/time"

type Props = {
  days: number[]
  onChange: (days: number[]) => void
}

export function DayPicker({ days, onChange }: Props) {
  function toggle(day: number) {
    Haptics.selectionAsync()
    onChange(days.includes(day) ? days.filter((d) => d !== day) : [...days, day])
  }

  return (
    <View style={styles.row}>
      {WEEK.map((w) => {
        const selected = days.includes(w.day)
        return (
          <Pressable
            key={w.day}
            accessibilityRole="checkbox"
            accessibilityLabel={w.name}
            accessibilityState={{ checked: selected }}
            onPress={() => toggle(w.day)}
            style={[styles.day, selected && styles.daySelected]}
          >
            <Text style={[styles.letter, selected && styles.letterSelected]}>{w.letter}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  day: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.dusk,
    alignItems: "center",
    justifyContent: "center",
  },
  daySelected: {
    backgroundColor: colors.dawn,
  },
  letter: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.mist,
  },
  letterSelected: {
    color: colors.dawnInk,
  },
})
