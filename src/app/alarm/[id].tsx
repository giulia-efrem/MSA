import { Ionicons } from "@expo/vector-icons"
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker"
import * as Haptics from "expo-haptics"
import { router, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { CodeScanner } from "@/components/code-scanner"
import { DayPicker } from "@/components/day-picker"
import { Hills, SkyBodies, SkyGradient, Stars } from "@/components/sky"
import { TaskPicker } from "@/components/task-picker"
import { Button, Section, Segmented } from "@/components/ui"
import { colors, fonts, radius, space } from "@/constants/theme"
import { newAlarmId, useAlarms } from "@/lib/alarms-context"
import { useCoords } from "@/lib/location"
import { clockTime, skyAt, sunTimes, wakeVsSunrise } from "@/lib/sun"
import { DIFFICULTIES, difficultyHint } from "@/lib/tasks"
import { describeDays, formatTime, nextRing } from "@/lib/time"
import type { Alarm } from "@/lib/types"

function blankAlarm(): Alarm {
  return {
    id: newAlarmId(),
    hour: 7,
    minute: 0,
    label: "",
    days: [1, 2, 3, 4, 5],
    enabled: true,
    task: "math",
    difficulty: "medium",
    wakeCheck: true,
  }
}

const CARD_HILLS = 36
const CARD_SKY = 64 // open sky under the time, where the sun and moon move

function timeAsDate(hour: number, minute: number): Date {
  const date = new Date()
  date.setHours(hour, minute, 0, 0)
  return date
}

export default function AlarmEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { alarms, saveAlarm, deleteAlarm } = useAlarms()
  const existing = alarms.find((alarm) => alarm.id === id)

  const [draft, setDraft] = useState<Alarm>(() => existing ?? blankAlarm())
  const [scanning, setScanning] = useState(false)
  const [card, setCard] = useState({ width: 0, height: 0 })
  const coords = useCoords()

  // The sky as it will look when this alarm next rings.
  const ringsAt = nextRing(draft)
  const sky = skyAt(ringsAt, coords)
  const sun = sunTimes(ringsAt, coords)
  const sunNote = wakeVsSunrise(ringsAt, coords)
  const about = coords.approximate ? "≈ " : ""
  const cardHorizon = card.height - CARD_HILLS * 0.55

  const update = (changes: Partial<Alarm>) => setDraft((current) => ({ ...current, ...changes }))
  const setTime = (date: Date) => update({ hour: date.getHours(), minute: date.getMinutes() })

  function openAndroidTimePicker() {
    DateTimePickerAndroid.open({
      value: timeAsDate(draft.hour, draft.minute),
      mode: "time",
      is24Hour: true,
      onValueChange: (_event, date) => setTime(date),
    })
  }

  // A scan alarm can only be stopped by its code, so it must have one.
  function isReady(): boolean {
    if (draft.task === "scan" && !draft.scanCode) {
      Alert.alert(
        "Register a code first",
        "Scanning is the only way to stop this alarm, so it needs a code to look for.",
      )
      return false
    }
    return true
  }

  function save() {
    if (!isReady()) return
    saveAlarm({ ...draft, enabled: true })
    router.back()
  }

  function testWakeUp() {
    if (!isReady()) return
    saveAlarm({ ...draft, enabled: true })
    router.replace({ pathname: "/ring/[id]", params: { id: draft.id, test: "1" } })
  }

  function confirmDelete() {
    Alert.alert("Delete this alarm?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete alarm",
        style: "destructive",
        onPress: () => {
          deleteAlarm(draft.id)
          router.back()
        },
      },
    ])
  }

  function codeScanned(code: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    update({ scanCode: code })
    setScanning(false)
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
        <Text style={styles.topTitle}>{existing ? "Edit alarm" : "New alarm"}</Text>
        <Pressable onPress={save} hitSlop={12} accessibilityRole="button">
          <Text style={styles.save}>Save</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* The time sits in the sky as it will look when the alarm rings */}
        <View
          style={styles.timeCard}
          onLayout={(e) =>
            setCard({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          }
        >
          <SkyGradient colors={sky.colors} />
          <Stars opacity={sky.stars * 0.8} />
          {card.width > 0 ? (
            <SkyBodies
              sky={sky}
              latitude={coords.latitude}
              width={card.width}
              horizon={cardHorizon}
              top={cardHorizon - CARD_SKY}
              sunSize={34}
              moonSize={22}
            />
          ) : null}
          <View style={styles.timeHills}>
            <Hills height={CARD_HILLS} />
          </View>
          {Platform.OS === "ios" ? (
            <DateTimePicker
              value={timeAsDate(draft.hour, draft.minute)}
              mode="time"
              display="spinner"
              themeVariant="dark"
              textColor={colors.moon}
              locale="en_GB"
              onValueChange={(_event, date) => setTime(date)}
              style={styles.iosPicker}
            />
          ) : (
            <Pressable
              onPress={openAndroidTimePicker}
              accessibilityRole="button"
              accessibilityHint="Opens the time picker"
              style={styles.androidTime}
            >
              <Text style={styles.androidTimeText}>{formatTime(draft.hour, draft.minute)}</Text>
              <Text style={styles.androidTimeHint}>Tap to change the time</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.sunInfo}>
          <View style={styles.sunTimes}>
            <View style={styles.sunTime}>
              <Ionicons name="sunny-outline" size={16} color={colors.dawn} />
              <Text style={styles.sunTimeText}>
                Sunrise {about}
                {clockTime(sun.sunrise)}
              </Text>
            </View>
            <View style={styles.sunTime}>
              <Ionicons name="moon-outline" size={16} color={colors.mist} />
              <Text style={styles.sunTimeText}>
                Sunset {about}
                {clockTime(sun.sunset)}
              </Text>
            </View>
          </View>
          {sunNote ? (
            <Text style={styles.sunNote}>
              You’ll wake up {sunNote.charAt(0).toLowerCase() + sunNote.slice(1)}.
            </Text>
          ) : null}
        </View>

        <Section title="Label">
          <TextInput
            value={draft.label}
            onChangeText={(label) => update({ label })}
            placeholder="For example, Morning lecture"
            placeholderTextColor={colors.mist}
            style={styles.input}
            maxLength={40}
            returnKeyType="done"
          />
        </Section>

        <Section title="Repeat" hint={describeDays(draft.days)}>
          <DayPicker days={draft.days} onChange={(days) => update({ days })} />
        </Section>

        <Section title="Wake-up task">
          <TaskPicker value={draft.task} onChange={(task) => update({ task })} />
        </Section>

        {draft.task === "scan" ? (
          <Section
            title="Your code"
            hint="Stick a QR code somewhere outside your bedroom, or use the barcode on something in your bathroom. Scanning it is the only way to stop this alarm."
          >
            {draft.scanCode ? (
              <View style={styles.codeSaved}>
                <Ionicons name="checkmark-circle" size={22} color={colors.leaf} />
                <Text style={styles.codeSavedText}>Code saved</Text>
                <Pressable onPress={() => setScanning(true)} hitSlop={8}>
                  <Text style={styles.link}>Replace</Text>
                </Pressable>
              </View>
            ) : (
              <Button
                label="Register a code"
                icon="scan-outline"
                variant="secondary"
                onPress={() => setScanning(true)}
              />
            )}
          </Section>
        ) : null}

        <Section title="Difficulty" hint={difficultyHint(draft.task, draft.difficulty)}>
          <Segmented
            options={DIFFICULTIES}
            value={draft.difficulty}
            onChange={(difficulty) => update({ difficulty })}
          />
        </Section>

        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchTitle}>Wake-up check</Text>
            <Text style={styles.switchHint}>
              5 minutes after the task, confirm you’re still up or the alarm rings again.
            </Text>
          </View>
          <Switch
            value={draft.wakeCheck}
            onValueChange={(wakeCheck) => update({ wakeCheck })}
            trackColor={{ false: colors.haze, true: colors.dawn }}
            thumbColor={colors.moon}
            ios_backgroundColor={colors.haze}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Test wake-up" icon="play" variant="secondary" onPress={testWakeUp} />
          {existing ? <Button label="Delete alarm" variant="danger" onPress={confirmDelete} /> : null}
        </View>
      </ScrollView>

      <Modal
        visible={scanning}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setScanning(false)}
      >
        <View style={styles.scanSheet}>
          <View style={styles.topBar}>
            <Pressable onPress={() => setScanning(false)} hitSlop={12}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.topTitle}>Register a code</Text>
            <View style={styles.topBarSpacer} />
          </View>
          <Text style={styles.scanHint}>
            Point the camera at the QR code or barcode you want to use.
          </Text>
          <View style={styles.scanner}>
            <CodeScanner onScan={codeScanned} paused={!scanning} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  topBarSpacer: {
    width: 52,
  },
  topTitle: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.moon,
  },
  cancel: {
    fontSize: 17,
    color: colors.mist,
  },
  save: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.dawn,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl * 2,
    gap: space.xl,
  },
  timeCard: {
    borderRadius: 28,
    overflow: "hidden",
    paddingBottom: CARD_SKY + CARD_HILLS - 20,
  },
  sunInfo: {
    gap: 6,
    marginTop: -space.md,
    paddingHorizontal: 4,
  },
  sunTimes: {
    flexDirection: "row",
    gap: space.lg,
  },
  sunTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sunTimeText: {
    fontSize: 14,
    color: colors.mist,
  },
  sunNote: {
    fontSize: 14,
    color: colors.moon,
  },
  timeHills: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  iosPicker: {
    alignSelf: "stretch",
  },
  androidTime: {
    alignItems: "center",
    paddingTop: space.lg,
    paddingBottom: space.md,
  },
  androidTimeText: {
    fontFamily: fonts.light,
    fontSize: 84,
    lineHeight: 96,
    color: colors.moon,
    fontVariant: ["tabular-nums"],
  },
  androidTimeHint: {
    fontSize: 14,
    color: colors.mist,
  },
  input: {
    backgroundColor: colors.dusk,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.moon,
  },
  codeSaved: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.dusk,
    borderRadius: radius.md,
    padding: space.md,
  },
  codeSavedText: {
    flex: 1,
    fontSize: 16,
    color: colors.moon,
  },
  link: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.dawn,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  switchText: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.moon,
  },
  switchHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mist,
  },
  actions: {
    gap: space.sm,
  },
  scanSheet: {
    flex: 1,
    backgroundColor: colors.night,
    paddingBottom: space.xl,
  },
  scanHint: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.moon,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  scanner: {
    flex: 1,
    marginHorizontal: space.lg,
  },
})