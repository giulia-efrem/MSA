import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import type { ComponentProps, ReactNode } from "react"
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native"

import { colors, fonts, radius, space } from "@/constants/theme"

type IconName = ComponentProps<typeof Ionicons>["name"]

// ---------- Button ----------

type ButtonProps = {
  label: string
  onPress: () => void
  variant?: "primary" | "secondary" | "dark" | "danger"
  icon?: IconName
  disabled?: boolean
  style?: ViewStyle
}

const BUTTON_COLORS = {
  primary: { background: colors.dawn, text: colors.dawnInk },
  secondary: { background: colors.dusk, text: colors.moon },
  dark: { background: colors.night, text: colors.moon },
  danger: { background: "transparent", text: colors.rose },
}

export function Button({ label, onPress, variant = "primary", icon, disabled, style }: ButtonProps) {
  const palette = BUTTON_COLORS[variant]
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync()
        onPress()
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={palette.text} /> : null}
      <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
    </Pressable>
  )
}

// ---------- Round icon button ----------

type IconButtonProps = {
  icon: IconName
  label: string // read out by screen readers
  onPress: () => void
}

export function IconButton({ icon, label, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.selectionAsync()
        onPress()
      }}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.dawnInk} />
    </Pressable>
  )
}

// ---------- Section with a small title ----------

type SectionProps = {
  title: string
  hint?: string
  children: ReactNode
}

export function Section({ title, hint, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

// ---------- Segmented control (Easy / Medium / Hard) ----------

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.selectionAsync()
              onChange(option.value)
            }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  buttonLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.dawn,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 6px 18px rgba(255, 178, 122, 0.35)",
  },
  section: {
    gap: space.sm + 2,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.mist,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mist,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.dusk,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  segmentSelected: {
    backgroundColor: colors.haze,
  },
  segmentLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.mist,
  },
  segmentLabelSelected: {
    fontFamily: fonts.semibold,
    color: colors.moon,
  },
})