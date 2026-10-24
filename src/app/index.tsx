import { Ionicons } from "@expo/vector-icons"
import { router, useIsFocused } from "expo-router"
import { Fragment, useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AlarmRow } from "@/components/alarm-row"
import { HomeScene } from "@/components/home-scene"
import { Button, IconButton } from "@/components/ui"
import { colors, fonts, radius, space } from "@/constants/theme"
import { IS_PREVIEW } from "@/lib/alarm-service"
import { useAlarms } from "@/lib/alarms-context"
import { useCoords } from "@/lib/location"
import { averageSleep } from "@/lib/score"
import { clockTime, skyAt, sunTimes, wakeVsSunrise } from "@/lib/sun"
import { taskInfo } from "@/lib/tasks"
import {
  currentStreak,
  describeDays,
  describeNext,
  formatLongDate,
  formatTime,
  greeting,
  nextRing,
} from "@/lib/time"
import { useWeather, weatherIcon } from "@/lib/weather"

export default function HomeScreen() {
  const { ready, alarms, records, setEnabled } = useAlarms()
  const coords = useCoords()
  const [now, setNow] = useState(() => new Date())
  const weather = useWeather(coords)
  const { width, height } = useWindowDimensions()
  const [textBottom, setTextBottom] = useState(0)
  const focused = useIsFocused() // pause the scene's animations while another screen is open

  // Refresh the "Rings in..." text every 30 seconds.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const upcoming = alarms
    .filter((alarm) => alarm.enabled)
    .map((alarm) => ({ alarm, at: nextRing(alarm, now) }))
    .sort((a, b) => a.at.getTime() - b.at.getTime())[0]

  const streak = currentStreak(records, now)
  const sleepAverage = averageSleep(records)

  // The real sky right now, and today's sunrise and sunset.
  const sky = skyAt(now, coords)
  const night = sky.sun.altitude < -4
  const today = sunTimes(now, coords)
  const about = coords.approximate ? "≈ " : ""
  const sunNote = upcoming ? wakeVsSunrise(upcoming.at, coords) : null

  const openEditor = (id: string) => router.push({ pathname: "/alarm/[id]", params: { id } })

  if (!ready) return <View style={styles.screen} />

  const sceneHeight = Math.max(500, Math.round(height * 0.62))

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* The top of the screen is one scene: the real sky, the weather and a little landscape */}
        <View style={{ height: sceneHeight }}>
          <HomeScene
            sky={sky}
            weather={weather}
            coords={coords}
            width={width}
            height={sceneHeight}
            skyTop={textBottom + 36}
            groundColor={colors.night}
            active={focused}
          />
          <SafeAreaView edges={["top"]} style={styles.sceneContent}>
            <View
              onLayout={(e) =>
                setTextBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
              }
            >
              <View style={styles.header}>
                <View>
                  <Text style={styles.date}>{formatLongDate(now)}</Text>
                  <Text style={styles.title}>{greeting(now)}</Text>
                </View>
                <IconButton icon="add" label="Add alarm" onPress={() => openEditor("new")} />
              </View>

              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <Text style={styles.heroCaption}>
                    {upcoming ? describeNext(upcoming.at, now) : "No alarm is on"}
                  </Text>
                  {weather ? (
                    <View
                      style={styles.weatherChip}
                      accessible
                      accessibilityLabel={`${Math.round(weather.temperature)} degrees, ${weather.label}`}
                    >
                      <Ionicons name={weatherIcon(weather, night)} size={16} color={colors.moon} />
                      <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°</Text>
                    </View>
                  ) : null}
                </View>
                {upcoming ? (
                  <>
                    <Text style={styles.heroTime}>
                      {formatTime(upcoming.alarm.hour, upcoming.alarm.minute)}
                    </Text>
                    <Text style={styles.heroDetail}>
                      {upcoming.alarm.label || describeDays(upcoming.alarm.days)}, then{" "}
                      {taskInfo(upcoming.alarm.task).title.toLowerCase()}
                    </Text>
                    {sunNote ? (
                      <View style={styles.sunNote}>
                        <Ionicons name="sunny" size={14} color={colors.dawn} />
                        <Text style={styles.sunNoteText}>
                          {about}
                          {sunNote}
                        </Text>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={styles.heroFree}>Free morning</Text>
                    <Text style={styles.heroDetail}>
                      {alarms.length > 0
                        ? "Turn an alarm on below to get up on time."
                        : "Tap + to set your first alarm."}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.sunRow}>
            <View style={styles.stat}>
              <Ionicons name="sunny-outline" size={16} color={colors.dawn} />
              <Text style={styles.statText}>
                Sunrise {about}
                {clockTime(today.sunrise)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="moon-outline" size={16} color={colors.mist} />
              <Text style={styles.statText}>
                Sunset {about}
                {clockTime(today.sunset)}
              </Text>
            </View>
          </View>

          {records.length > 0 ? (
            <View style={styles.streakRow}>
              <View style={styles.stat}>
                <Ionicons name="flame" size={16} color={colors.dawn} />
                <Text style={styles.statText}>
                  {streak === 1 ? "1 morning in a row" : `${streak} mornings in a row`}
                </Text>
              </View>
              {sleepAverage !== null ? (
                <View style={styles.stat}>
                  <Ionicons name="bed" size={16} color={colors.dawn} />
                  <Text style={styles.statText}>Sleep {sleepAverage}/10 lately</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {alarms.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Set your first alarm</Text>
              <Text style={styles.emptyText}>
                Pick a time and the task that gets you out of bed.
              </Text>
              <Button label="Add an alarm" icon="add" onPress={() => openEditor("new")} />
            </View>
          ) : (
            <View style={styles.list}>
              <Text style={styles.listTitle}>Your alarms</Text>
              <View style={styles.group}>
                {alarms.map((alarm, index) => (
                  <Fragment key={alarm.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <AlarmRow
                      alarm={alarm}
                      onPress={() => openEditor(alarm.id)}
                      onToggle={(enabled) => setEnabled(alarm.id, enabled)}
                    />
                  </Fragment>
                ))}
              </View>
            </View>
          )}

          {IS_PREVIEW ? (
            <View style={styles.preview}>
              <Ionicons name="information-circle-outline" size={16} color={colors.mist} />
              <Text style={styles.previewText}>
                Preview mode. Alarms can’t ring on their own in Expo Go yet, so open one and tap
                Test wake-up to try it.
              </Text>
            </View>
          ) : null}

          {weather ? <Text style={styles.credit}>Weather data by Open-Meteo.com</Text> : null}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  content: {
    paddingHorizontal: space.lg - 4,
    gap: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.md,
    paddingHorizontal: 4,
  },
  date: {
    fontSize: 14,
    color: colors.mist,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 28,
    color: colors.moon,
  },
  scroll: {
    paddingBottom: space.xl * 2,
  },
  sceneContent: {
    paddingHorizontal: space.lg - 4,
  },
  // The next alarm, written straight onto the sky
  hero: {
    marginTop: space.lg,
    paddingHorizontal: 4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  weatherChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(11, 13, 34, 0.45)",
  },
  weatherTemp: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.moon,
  },
  sunNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  sunNoteText: {
    fontSize: 14,
    color: colors.moon,
    opacity: 0.85,
  },
  heroCaption: {
    flex: 1,
    fontSize: 15,
    color: colors.mist,
  },
  heroTime: {
    fontFamily: fonts.light,
    fontSize: 80,
    lineHeight: 92,
    color: colors.moon,
    fontVariant: ["tabular-nums"],
  },
  heroFree: {
    fontFamily: fonts.light,
    fontSize: 44,
    lineHeight: 64,
    marginVertical: 14,
    color: colors.moon,
  },
  heroDetail: {
    fontSize: 16,
    color: colors.moon,
  },
  sunRow: {
    flexDirection: "row",
    gap: space.lg,
    paddingHorizontal: 6,
    marginTop: -space.md,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: colors.mist,
  },
  streakRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.lg,
    paddingHorizontal: 6,
    marginTop: -space.sm,
  },
  // Alarm list
  list: {
    gap: space.sm + 2,
  },
  listTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.mist,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: colors.dusk,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.haze,
    marginLeft: 18,
  },
  // Empty state
  empty: {
    alignItems: "center",
    gap: space.sm,
    paddingTop: space.md,
    paddingHorizontal: space.lg,
  },
  emptyTitle: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.moon,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.mist,
    textAlign: "center",
    marginBottom: space.sm,
  },
  // Preview note
  preview: {
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.sm,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mist,
  },
  credit: {
    fontSize: 12,
    color: colors.mist,
    opacity: 0.7,
    textAlign: "center",
  },
})