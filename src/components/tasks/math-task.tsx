import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { useState } from "react"
import { Animated, Pressable, StyleSheet, Text, View } from "react-native"

import { colors, fonts, radius, space } from "@/constants/theme"
import { MATH_PROBLEMS } from "@/lib/tasks"
import type { Difficulty, TaskProps } from "@/lib/types"

type Problem = { text: string; answer: number }

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

function makeProblem(difficulty: Difficulty): Problem {
  if (difficulty === "easy") {
    const a = random(12, 49)
    const b = random(3, 9)
    return { text: `${a} + ${b}`, answer: a + b }
  }
  if (difficulty === "medium") {
    const a = random(23, 89)
    const b = random(14, 59)
    return { text: `${a} + ${b}`, answer: a + b }
  }
  const a = random(6, 14)
  const b = random(3, 9)
  const c = random(11, 49)
  return { text: `${a} × ${b} + ${c}`, answer: a * b + c }
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "delete", "0", "check"]

export function MathTask({ difficulty, onActivity, onComplete }: TaskProps) {
  const [problems] = useState(() =>
    Array.from({ length: MATH_PROBLEMS[difficulty] }, () => makeProblem(difficulty)),
  )
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState("")
  const [shake] = useState(() => new Animated.Value(0))

  const problem = problems[index]

  function wrongAnswer() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    setInput("")
    Animated.sequence([
      Animated.timing(shake, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start()
  }

  function press(key: string) {
    onActivity()
    if (key === "delete") {
      Haptics.selectionAsync()
      setInput((value) => value.slice(0, -1))
      return
    }
    if (key === "check") {
      if (input === "") return
      if (Number(input) !== problem.answer) return wrongAnswer()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      if (index === problems.length - 1) return onComplete()
      setIndex(index + 1)
      setInput("")
      return
    }
    Haptics.selectionAsync()
    if (input.length < 4) setInput(input + key)
  }

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {problems.map((p, i) => (
          <View key={i} style={[styles.dot, i <= index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.problemArea}>
        <Text style={styles.problem}>{problem.text}</Text>
        <Animated.View style={[styles.answerBox, { transform: [{ translateX: shake }] }]}>
          <Text style={[styles.answer, input === "" && styles.placeholder]}>
            {input === "" ? "?" : input}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={key === "delete" ? "Delete" : key === "check" ? "Check answer" : key}
            onPress={() => press(key)}
            style={({ pressed }) => [
              styles.key,
              key === "check" && styles.checkKey,
              pressed && styles.keyPressed,
            ]}
          >
            {key === "delete" ? (
              <Ionicons name="backspace-outline" size={26} color={colors.moon} />
            ) : key === "check" ? (
              <Ionicons name="checkmark" size={30} color={colors.dawnInk} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    gap: space.lg,
  },
  progress: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.haze,
  },
  dotActive: {
    backgroundColor: colors.dawn,
  },
  problemArea: {
    alignItems: "center",
    gap: space.md,
  },
  problem: {
    fontFamily: fonts.semibold,
    fontSize: 44,
    color: colors.moon,
  },
  answerBox: {
    minWidth: 140,
    paddingHorizontal: space.lg,
    paddingBottom: space.xs,
    borderBottomWidth: 2,
    borderBottomColor: colors.dawn,
    alignItems: "center",
  },
  answer: {
    fontFamily: fonts.light,
    fontSize: 56,
    color: colors.dawn,
  },
  placeholder: {
    color: colors.haze,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: space.sm + 2,
  },
  key: {
    width: "31.5%",
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.dusk,
    alignItems: "center",
    justifyContent: "center",
  },
  checkKey: {
    backgroundColor: colors.dawn,
  },
  keyPressed: {
    opacity: 0.7,
  },
  keyText: {
    fontFamily: fonts.regular,
    fontSize: 26,
    color: colors.moon,
  },
})
