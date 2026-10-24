import { Ionicons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { MathTask } from "@/components/tasks/math-task"
import { MemoryTask } from "@/components/tasks/memory-task"
import { ScanTask } from "@/components/tasks/scan-task"
import { ShakeTask } from "@/components/tasks/shake-task"
import { Hills, Moon, SkyGradient, Stars, Sun } from "@/components/sky"
import { Button } from "@/components/ui"
import { WeatherLayer } from "@/components/weather-layer"
import { colors, fonts, ground, radius, space } from "@/constants/theme"
import { IS_PREVIEW, scheduleWakeCheck, stopRinging } from "@/lib/alarm-service"
import { useAlarms } from "@/lib/alarms-context"
import { useCoords } from "@/lib/location"
import { pickWakeMessage } from "@/lib/messages"
import { gradeReply, gradeWord } from "@/lib/score"
import { beforeSunrise, skyAt, skyPoint, sunNote } from "@/lib/sun"
import { DIFFICULTIES, IDLE_SECONDS, taskInfo } from "@/lib/tasks"
import { currentStreak, formatDuration, formatLongDate, formatTime } from "@/lib/time"
import type { TaskType } from "@/lib/types"
import { greySky, useWeather, weatherMood } from "@/lib/weather"

type Phase = "ringing" | "task" | "done"
type Result = { seconds: number; checkAt: Date | null; message: string; finishedAt: string }

const secondsSince = (start: number) => Math.max(1, Math.round((Date.now() - start) / 1000))

// How far above (+) or below (-) the horizon the big sun's center sits, in pixels.
// It follows the real sun: on a dark winter morning it's still hidden behind the hills.
function sunLift(altitude: number, size: number): number {
  if (altitude >= 0) return (Math.min(altitude, 25) / 25) * size * 0.7
  return altitude * (size / 12)
}

export default function RingScreen() {
  const { id, test } = useLocalSearchParams<{ id: string; test?: string }>()
  const isTest = test === "1"
  const { ready, alarms, records, saveAlarm, addRecord, gradeSleep } = useAlarms()
  const alarm = alarms.find((a) => a.id === id)
  const { width, height } = useWindowDimensions()
  const coords = useCoords()
  const weather = useWeather(coords)

  const [phase, setPhase] = useState<Phase>("ringing")
  const [startedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => new Date())
  const [lastActivity, setLastActivity] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [grade, setGrade] = useState<number | null>(null) // your 1 to 10 sleep grade
  const [rise] = useState(() => new Animated.Value(0))

  // A scan alarm without a code falls back to math, so it can still be stopped.
  const task: TaskType = alarm?.task === "scan" && !alarm.scanCode ? "math" : (alarm?.task ?? "math")

  // If the person stops making progress during the task, the alarm comes back.
  const idleLimit = IDLE_SECONDS[task]
  const idleFor = Math.max(0, Math.floor((now.getTime() - lastActivity) / 1000))
  const timedOut = phase === "task" && idleFor >= idleLimit
  const ringing = phase === "ringing" || timedOut

  // Clock tick, once per second.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Vibrate in a loop while ringing. (A real alarm sound comes with the native alarm library.)
  useEffect(() => {
    if (!ringing) return
    Vibration.vibrate([0, 800, 600], true)
    return () => Vibration.cancel()
  }, [ringing])

  // Block the Android back button until the task is done.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => phase !== "done")
    return () => subscription.remove()
  }, [phase])

  // The sun slowly rises the longer the alarm rings (it just sits still if Reduce Motion is on).
  useEffect(() => {
    if (!ringing) return
    let cancelled = false
    let animation: Animated.CompositeAnimation | null = null
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return
      if (reduceMotion) {
        rise.setValue(0.6)
        return
      }
      animation = Animated.timing(rise, {
        toValue: 1,
        duration: 45_000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
      animation.start()
    })
    return () => {
      cancelled = true
      animation?.stop()
    }
  }, [ringing, rise])

  function startTask() {
    setLastActivity(Date.now())
    setPhase("task")
  }

  function markActivity() {
    setLastActivity(Date.now())
  }

  async function finish() {
    if (!alarm) return
    const seconds = secondsSince(startedAt)
    setPhase("done")
    await stopRinging(alarm.id)

    const finishedAt = new Date()
    const record = { alarmId: alarm.id, finishedAt: finishedAt.toISOString(), seconds }
    const streak = currentStreak([...records, record], finishedAt)
    addRecord(record)

    // One-time alarms switch themselves off after ringing.
    if (!isTest && alarm.days.length === 0) saveAlarm({ ...alarm, enabled: false })
    const checkAt = alarm.wakeCheck ? await scheduleWakeCheck(alarm) : null
    const message = await pickWakeMessage({
      hour: alarm.hour,
      minute: alarm.minute,
      beforeSunrise: beforeSunrise(finishedAt, coords),
      weekend: finishedAt.getDay() === 0 || finishedAt.getDay() === 6,
      streak,
      seconds,
      weather,
    })
    setResult({ seconds, checkAt, message, finishedAt: record.finishedAt })
  }

  function pickGrade(value: number) {
    if (!result) return
    Haptics.selectionAsync()
    setGrade(value)
    gradeSleep(result.finishedAt, value)
  }

  function close() {
    if (router.canGoBack()) router.back()
    else router.replace("/")
  }

  if (!ready) return <View style={styles.screen} />

  if (!alarm) {
    return (
      <SafeAreaView style={[styles.screen, styles.centered]}>
        <Text style={styles.doneText}>This alarm no longer exists.</Text>
        <Button label="Close" variant="secondary" onPress={close} />
      </SafeAreaView>
    )
  }

  const info = taskInfo(task)
  const difficultyLabel = DIFFICULTIES.find((d) => d.value === alarm.difficulty)?.label ?? ""

  // The real sky outside right now, greyed out if it's cloudy.
  const sky = skyAt(now, coords)
  const mood = weatherMood(weather)
  const skyColors = greySky(sky.colors, mood.grey)
  const night = sky.sun.altitude < -4
  const earlyBird = beforeSunrise(now, coords)
  const sunText = sunNote(now, coords)
  const weatherText = weather
    ? `${Math.round(weather.temperature)}°, ${weather.label.toLowerCase()}`
    : null

  // The moon, placed where it really is, in the open sky between the text and the hills.
  function moonSpot(horizon: number, size: number) {
    const point = skyPoint(sky.moon.altitude, sky.moon.azimuth, coords.latitude)
    const skyTop = height * 0.4
    return {
      left: point.x * width - size / 2,
      top: horizon - point.y * (horizon - skyTop) - size / 2,
    }
  }

  // ---------- Ringing ----------
  if (ringing) {
    const sun = Math.min(width * 0.62, 280)
    const groundHeight = Math.round(height * 0.27)
    const hillsHeight = Math.round(height * 0.09)
    const horizon = groundHeight + hillsHeight * 0.45
    const horizonFromTop = height - horizon
    const sunRise = rise.interpolate({ inputRange: [0, 1], outputRange: [sun * 0.12, 0] })

    return (
      <View style={styles.screen}>
        <SkyGradient colors={skyColors} />
        <Stars opacity={sky.stars * mood.stars} twinkle />
        {sky.moon.altitude > 0 ? (
          <View style={[styles.sunWrap, moonSpot(horizonFromTop, 34), { opacity: mood.bodies }]}>
            <Moon size={34} fraction={sky.moon.fraction} waxing={sky.moon.waxing} />
          </View>
        ) : null}
        {sky.sun.altitude > -6 ? (
          <Animated.View
            style={[
              styles.sunWrap,
              {
                left: (width - sun) / 2,
                bottom: horizon + sunLift(sky.sun.altitude, sun) - sun / 2,
                opacity: mood.bodies,
                transform: [{ translateY: sunRise }],
              },
            ]}
          >
            <Sun size={sun} color={sky.sun.color} glow={sky.sun.glow} />
          </Animated.View>
        ) : null}
        <WeatherLayer weather={weather} width={width} height={height} night={night} />
        <View style={[styles.hills, { bottom: groundHeight - 1 }]}>
          <Hills height={hillsHeight} />
        </View>
        <View style={[styles.ground, { height: groundHeight }]} />

        <SafeAreaView style={styles.ringLayout}>
          <View style={styles.ringTop}>
            <Text style={styles.ringDate}>{formatLongDate(now)}</Text>
            {isTest ? <Text style={styles.testPill}>Test</Text> : null}
          </View>

          <View style={styles.ringCenter}>
            <Text style={styles.ringTime}>{formatTime(now.getHours(), now.getMinutes())}</Text>
            <Text style={styles.ringLabel}>{alarm.label || "Time to get up"}</Text>
            {sunText ? <Text style={styles.ringSun}>{sunText}</Text> : null}
            {weatherText ? <Text style={styles.ringSun}>{weatherText}</Text> : null}
            {timedOut ? (
              <Text style={styles.ringBack}>You stopped, so the alarm is back.</Text>
            ) : null}
          </View>

          <View style={styles.ringBottom}>
            <View style={styles.ringTask}>
              <Ionicons name={info.icon} size={18} color={info.color} />
              <Text style={styles.ringTaskText}>
                {info.title}, {difficultyLabel.toLowerCase()}
              </Text>
            </View>
            <Button label="Start task" onPress={startTask} style={styles.wide} />
            <Text style={styles.ringHint}>It keeps ringing until the task is done.</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  // ---------- Doing the task ----------
  if (phase === "task") {
    const remaining = Math.max(0, idleLimit - idleFor)

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <View style={styles.taskTitleLeft}>
              <View style={[styles.taskIcon, { backgroundColor: `${info.color}24` }]}>
                <Ionicons name={info.icon} size={18} color={info.color} />
              </View>
              <Text style={styles.taskTitle}>{info.title}</Text>
            </View>
            {isTest ? <Text style={styles.testPill}>Test</Text> : null}
          </View>
          <View style={styles.idleTrack}>
            <View
              style={[
                styles.idleFill,
                { width: `${(remaining / idleLimit) * 100}%`, backgroundColor: info.color },
              ]}
            />
          </View>
          <Text style={styles.idleText}>The alarm comes back in {remaining} s if you stop.</Text>
        </View>
        <View style={styles.taskBody}>
          {task === "math" ? (
            <MathTask difficulty={alarm.difficulty} onActivity={markActivity} onComplete={finish} />
          ) : null}
          {task === "memory" ? (
            <MemoryTask difficulty={alarm.difficulty} onActivity={markActivity} onComplete={finish} />
          ) : null}
          {task === "shake" ? (
            <ShakeTask difficulty={alarm.difficulty} onActivity={markActivity} onComplete={finish} />
          ) : null}
          {task === "scan" && alarm.scanCode ? (
            <ScanTask
              code={alarm.scanCode}
              difficulty={alarm.difficulty}
              onActivity={markActivity}
              onComplete={finish}
            />
          ) : null}
        </View>
      </SafeAreaView>
    )
  }

  // ---------- Done ----------
  if (!result) return <View style={styles.screen} />

  const streak = currentStreak(records)
  const checkTime = result.checkAt
    ? formatTime(result.checkAt.getHours(), result.checkAt.getMinutes())
    : null
  const doneSun = Math.min(width * 0.36, 160)
  const doneGround = Math.max(Math.round(height * 0.44), 360)
  const doneHills = Math.round(height * 0.07)
  const doneHorizon = doneGround + doneHills * 0.45

  return (
    <View style={styles.screen}>
      <SkyGradient colors={skyColors} />
      <Stars opacity={sky.stars * mood.stars} />
      {sky.moon.altitude > 0 ? (
        <View style={[styles.sunWrap, moonSpot(height - doneHorizon, 30), { opacity: mood.bodies }]}>
          <Moon size={30} fraction={sky.moon.fraction} waxing={sky.moon.waxing} />
        </View>
      ) : null}
      {sky.sun.altitude > -6 ? (
        <View
          style={[
            styles.sunWrap,
            {
              left: (width - doneSun) / 2,
              bottom: doneHorizon + sunLift(sky.sun.altitude, doneSun) - doneSun / 2,
              opacity: mood.bodies,
            },
          ]}
        >
          <Sun size={doneSun} color={sky.sun.color} glow={sky.sun.glow} />
        </View>
      ) : null}
      <WeatherLayer weather={weather} width={width} height={height} night={night} />
      <View style={[styles.hills, { bottom: doneGround - 1 }]}>
        <Hills height={doneHills} />
      </View>
      <View style={[styles.ground, { height: doneGround }]} />

      <SafeAreaView style={styles.ringLayout}>
        <View style={styles.doneTop}>
          <Text style={styles.doneTitle}>{earlyBird ? "Up before the sun" : "You’re up"}</Text>
          <Text style={styles.ringDate}>
            {[sunText ?? formatLongDate(now), weatherText].filter(Boolean).join(", ")}
          </Text>
          <Text style={styles.doneMessage}>{result.message}</Text>
        </View>

        <View style={styles.doneBottom}>
          <View style={styles.gradeBlock}>
            <Text style={styles.gradeQuestion}>How did you sleep?</Text>
            <View style={styles.gradeGrid} accessibilityRole="radiogroup">
              {[
                [1, 2, 3, 4, 5],
                [6, 7, 8, 9, 10],
              ].map((row) => (
                <View key={row[0]} style={styles.gradeRow}>
                  {row.map((value) => {
                    const selected = grade === value
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityLabel={`${value} out of 10`}
                        accessibilityState={{ selected }}
                        onPress={() => pickGrade(value)}
                        style={({ pressed }) => [
                          styles.gradeButton,
                          selected && styles.gradeButtonSelected,
                          pressed && styles.gradeButtonPressed,
                        ]}
                      >
                        <Text style={[styles.gradeNumber, selected && styles.gradeNumberSelected]}>
                          {value}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              ))}
            </View>
            {grade !== null ? (
              <View>
                <Text style={styles.gradeResult}>
                  <Text style={styles.gradeResultScore}>{grade}/10</Text> {gradeWord(grade)}
                </Text>
                <Text style={styles.gradeReply}>{gradeReply(grade)}</Text>
              </View>
            ) : (
              <Text style={styles.gradeReply}>Tap a number from 1 (awful) to 10 (amazing).</Text>
            )}
          </View>
          <View style={styles.doneStats}>
            <View style={styles.doneStat}>
              <Ionicons name="checkmark-circle" size={18} color={colors.leaf} />
              <Text style={styles.doneText}>Done in {formatDuration(result.seconds)}</Text>
            </View>
            {streak > 0 ? (
              <View style={styles.doneStat}>
                <Ionicons name="flame" size={18} color={colors.dawn} />
                <Text style={styles.doneText}>
                  {streak === 1 ? "1 morning" : `${streak} mornings`} in a row
                </Text>
              </View>
            ) : null}
          </View>
          {checkTime ? (
            <Text style={styles.doneNote}>
              {IS_PREVIEW
                ? `In the full version, a wake-up check rings at ${checkTime}.`
                : `Wake-up check at ${checkTime}. Confirm you’re still up when it rings.`}
            </Text>
          ) : null}
          <Button label="Start my day" onPress={close} style={styles.wide} />
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
    overflow: "hidden",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.lg,
    padding: space.lg,
  },
  wide: {
    alignSelf: "stretch",
  },
  // Ringing
  sunWrap: {
    position: "absolute",
  },
  hills: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  ground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ground,
  },
  ringLayout: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  ringTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.md,
  },
  ringDate: {
    fontSize: 16,
    color: colors.mist,
  },
  testPill: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.night,
    backgroundColor: colors.mist,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  ringCenter: {
    marginTop: space.xl,
    gap: space.xs,
  },
  ringTime: {
    fontFamily: fonts.light,
    fontSize: 96,
    lineHeight: 108,
    color: colors.moon,
    fontVariant: ["tabular-nums"],
  },
  ringLabel: {
    fontFamily: fonts.semibold,
    fontSize: 22,
    color: colors.moon,
  },
  ringSun: {
    fontSize: 16,
    color: colors.moon,
    opacity: 0.8,
    marginTop: space.xs,
  },
  ringBack: {
    fontSize: 16,
    color: colors.dawn,
    marginTop: space.sm,
  },
  ringBottom: {
    marginTop: "auto",
    alignItems: "center",
    gap: space.md,
    paddingBottom: space.lg,
  },
  ringTask: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ringTaskText: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.moon,
  },
  ringHint: {
    fontSize: 14,
    color: colors.mist,
  },
  // Task
  taskHeader: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  taskTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm + 2,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  taskTitle: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    color: colors.moon,
  },
  idleTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dusk,
    overflow: "hidden",
  },
  idleFill: {
    height: "100%",
  },
  idleText: {
    fontSize: 13,
    color: colors.mist,
  },
  taskBody: {
    flex: 1,
    padding: space.lg,
  },
  // Done
  doneTop: {
    paddingTop: space.xl,
    gap: space.xs,
  },
  doneTitle: {
    fontFamily: fonts.semibold,
    fontSize: 38,
    color: colors.moon,
  },
  doneMessage: {
    fontSize: 18,
    lineHeight: 25,
    color: colors.moon,
    marginTop: space.md,
    maxWidth: 330,
  },
  doneBottom: {
    marginTop: "auto",
    gap: space.md + 4,
    paddingBottom: space.lg,
  },
  gradeBlock: {
    gap: space.sm + 2,
  },
  gradeQuestion: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.moon,
  },
  gradeGrid: {
    gap: 6,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 6,
  },
  gradeButton: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.dusk,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeButtonSelected: {
    backgroundColor: colors.dawn,
  },
  gradeButtonPressed: {
    opacity: 0.7,
  },
  gradeNumber: {
    fontFamily: fonts.semibold,
    fontSize: 17,
    color: colors.mist,
  },
  gradeNumberSelected: {
    color: colors.dawnInk,
  },
  gradeResult: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.moon,
  },
  gradeResultScore: {
    color: colors.dawn,
  },
  gradeReply: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mist,
  },
  doneStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
  },
  doneStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  doneText: {
    fontSize: 15,
    color: colors.moon,
  },
  doneNote: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mist,
  },
})