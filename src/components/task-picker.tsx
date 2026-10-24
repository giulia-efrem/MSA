import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { Fragment } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, fonts, radius, space } from "@/constants/theme"
import { TASKS } from "@/lib/tasks"
import type { TaskType } from "@/lib/types"

type Props = {
  value: TaskType
  onChange: (task: TaskType) => void
}

export function TaskPicker({ value, onChange }: Props) {
  return (
    <View style={styles.group} accessibilityRole="radiogroup">
      {TASKS.map((task, index) => {
        const selected = task.type === value
        return (
          <Fragment key={task.type}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => {
                Haptics.selectionAsync()
                onChange(task.type)
              }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: selected ? task.color : `${task.color}22` },
                ]}
              >
                <Ionicons
                  name={task.icon}
                  size={22}
                  color={selected ? colors.dawnInk : task.color}
                />
              </View>
              <View style={styles.text}>
                <Text style={styles.title}>{task.title}</Text>
                <Text style={styles.description}>{task.description}</Text>
              </View>
              <Ionicons
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={selected ? task.color : colors.haze}
              />
            </Pressable>
          </Fragment>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.dusk,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.haze,
    marginLeft: 76,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 14,
    paddingHorizontal: space.md,
  },
  rowPressed: {
    backgroundColor: colors.haze,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.moon,
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
    color: colors.mist,
  },
})