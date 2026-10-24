import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { Fragment, useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { AlarmRow } from "@/components/alarm-row"
import { Hills, SkyBodies, SkyGradient, Stars } from "@/components/sky"
import { Button, IconButton } from "@/components/ui"
import { colors, fonts, ground, radius, space } from "@/constants/theme"
import { IS_PREVIEW } from "@/lib/alarm-service"
import { useAlarms } from "@/lib/alarms-context"
import { useCoords } from "@/lib/location"
import { clockTime, skyAt, sunTimes, wakeVsSunrise } from "@/lib/sun"
import { taskInfo } from "@/lib/tasks"
import {
  averageSeconds,
  currentStreak,
  describeDays,
  describeNext,
  formatDuration,
  formatLongDate,
  formatTime,
  greeting,
  nextRing,
} from "@/lib/time"

const SUN = 44
const MOON = 26
const SKY_BAND = 64 // open sky between the text and the hills, where the sun and moon move
const GROUND = 46 // the dark strip at the bottom of the sky card
const HILLS = 40 // how tall the hills above it are

export default function HomeScreen() {
  const { ready, alarms, records, setEnabled } = useAlarms()
  const coords = useCoords()
  const [now, setNow] = useState(() => new Date())
  const [heroWidth, setHeroWidth] = useState(0)
  const [textBottom, setTextBottom] = useState(0)

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
  const average = averageSeconds(records)

  // The real sky right now, and today's sunrise and sunset.
  const sky = skyAt(now, coords)
  const today = sunTimes(now, coords)
  const about = coords.approximate ? "≈ " : ""
  const sunNote = upcoming ? wakeVsSunrise(upcoming.at, coords) : null

  const openEditor = (id: string) => router.push({ pathname: "/alarm/[id]", params: { id } })

  if (!ready) return <View style={styles.screen} />

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.date}>{formatLongDate(now)}</Text>
            <Text style={styles.title}>{greeting(now)}</Text>
          </View>
          <IconButton icon="add" label="Add alarm" onPress={() => openEditor("new")} />
        </View>

        {/* The next alarm, over the real sky outside right now */}
        <View style={styles.hero} onLayout={(e) => setHeroWidth(e.nativeEvent.layout.width)}>
          <SkyGradient colors={sky.colors} />
          <Stars opacity={sky.stars} />
          {heroWidth > 0 && textBottom > 0 ? (
            <SkyBodies
              sky={sky}
              latitude={coords.latitude}
              width={heroWidth}
              horizon={textBottom + SKY_BAND + HILLS * 0.45}
              top={textBottom + SUN / 2}
              sunSize={SUN}
              moonSize={MOON}
            />
          ) : null}

          <View style={styles.heroContent}>
            <View
              onLayout={(e) =>
                setTextBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
              }
            >
              {upcoming ? (
                <>
                  <Text style={styles.heroCaption}>{describeNext(upcoming.at, now)}</Text>
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
                  <Text style={styles.heroCaption}>No alarm is on</Text>
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

          <View style={styles.hills}>
            <Hills height={HILLS} />
          </View>

          <View style={styles.ground}>
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
        </View>

        {records.length > 0 ? (
          <View style={styles.streakRow}>
            <View style={styles.stat}>
              <Ionicons name="flame" size={16} color={colors.dawn} />
              <Text style={styles.statText}>
                {streak === 1 ? "1 morning in a row" : `${streak} mornings in a row`}
              </Text>
            </View>
            {average !== null ? (
              <View style={styles.stat}>
                <Ionicons name="timer-outline" size={16} color={colors.dawn} />
                <Text style={styles.statText}>Up in {formatDuration(average)} on average</Text>
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
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.night,
  },
  content: {
    paddingHorizontal: space.lg - 4,
    paddingBottom: space.xl * 2,
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
  // Hero sky card
  hero: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: colors.night,
  },
  heroContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: SKY_BAND + HILLS + GROUND,
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
  hills: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: GROUND - 1,
  },
  heroCaption: {
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
  ground: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: GROUND,
    backgroundColor: ground,
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingHorizontal: 22,
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
})