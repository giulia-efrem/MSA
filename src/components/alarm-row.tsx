import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { Pressable, StyleSheet, Switch, Text, View } from "react-native"

import { colors, fonts, radius, space } from "@/constants/theme"
import { taskInfo } from "@/lib/tasks"
import { formatTime, WEEK } from "@/lib/time"
import type { Alarm } from "@/lib/types"

type Props = {
  alarm: Alarm
  onPress: () => void
  onToggle: (enabled: boolean) => void
}

export function AlarmRow({ alarm, onPress, onToggle }: Props) {
  const task = taskInfo(alarm.task)
  const dim = !alarm.enabled

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityHint="Opens the alarm to edit it"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* The task's color and icon, so you can tell alarms apart at a glance */}
      <View style={[styles.taskBadge, { backgroundColor: `${task.color}${dim ? "14" : "24"}` }]}>
        <Ionicons name={task.icon} size={20} color={dim ? colors.mist : task.color} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.time, dim && styles.dim]}>{formatTime(alarm.hour, alarm.minute)}</Text>
        {alarm.label ? (
          <Text style={[styles.label, dim && styles.dim]} numberOfLines={1}>
            {alarm.label}
          </Text>
        ) : null}
        {alarm.days.length === 0 ? (
          <Text style={styles.once}>Once</Text>
        ) : (
          <View style={styles.week}>
            {WEEK.map((w) => {
              const on = alarm.days.includes(w.day)
              return (
                <Text
                  key={w.day}
                  style={[styles.weekLetter, on && styles.weekOn, on && !dim && { color: task.color }]}
                >
                  {w.letter}
                </Text>
              )
            })}
          </View>
        )}
      </View>

      <Switch
        value={alarm.enabled}
        onValueChange={(enabled) => {
          Haptics.selectionAsync()
          onToggle(enabled)
        }}
        trackColor={{ false: colors.haze, true: colors.dawn }}
        thumbColor={colors.moon}
        ios_backgroundColor={colors.haze}
        accessibilityLabel={`Alarm at ${formatTime(alarm.hour, alarm.minute)}`}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    backgroundColor: colors.haze,
  },
  taskBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md - 2,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  time: {
    fontFamily: fonts.light,
    fontSize: 38,
    lineHeight: 46,
    color: colors.moon,
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontSize: 15,
    color: colors.moon,
  },
  dim: {
    color: colors.mist,
    opacity: 0.6,
  },
  once: {
    fontSize: 13,
    color: colors.mist,
    marginTop: 2,
  },
  week: {
    flexDirection: "row",
    gap: space.sm,
    marginTop: 3,
  },
  weekLetter: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.haze,
  },
  weekOn: {
    color: colors.mist,
  },
})