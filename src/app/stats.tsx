import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { Button } from "@/components/ui"
import { colors, fonts, radius, space } from "@/constants/theme"
import { useAlarms } from "@/lib/alarms-context"
import { fetchStats, serverAddress, syncWakeUps, type Stats } from "@/lib/api"
import { taskInfo } from "@/lib/tasks"
import { formatDuration } from "@/lib/time"

// "Your mornings": everything here comes from the backend's database.

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// "2026-11-24" -> a Date on that day
function dayFrom(date: string): Date {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// "2026-11-24" -> "Tue 24 Nov"
function shortDate(date: string): string {
  const d = dayFrom(date)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

function gradeColor(grade: number): string {
  if (grade >= 8) return colors.dawn
  if (grade >= 5) return "#B9A8FF"
  return colors.rose
}

type Status = "loading" | "ready" | "error"

export default function StatsScreen() {
  const { records, alarms } = useAlarms()
  const { width } = useWindowDimensions()
  const [stats, setStats] = useState<Stats | null>(null)
  const [status, setStatus] = useState<Status>("loading")
  const [refreshing, setRefreshing] = useState(false)

  // Sends any wake-ups the server doesn't have yet, then asks it for the numbers.
  const load = useCallback(async () => {
    try {
      await syncWakeUps(records, alarms)
      setStats(await fetchStats())
      setStatus("ready")
    } catch {
      setStatus("error")
    } finally {
      setRefreshing(false)
    }
  }, [records, alarms])

  // Load every time the screen opens.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  function refresh() {
    setRefreshing(true)
    load()
  }

  const tileWidth = (width - space.lg * 2 - space.sm * 1.5) / 2
  const tiles = stats
    ? [
        {
          icon: "bed" as const,
          value: stats.averageSleep === null ? "–" : `${stats.averageSleep}`,
          unit: stats.averageSleep === null ? "" : "/10",
          label: "Sleep lately",
        },
        { icon: "sunny" as const, value: `${stats.mornings}`, unit: "", label: "Mornings" },
        {
          icon: "flame" as const,
          value: `${stats.bestStreak}`,
          unit: stats.bestStreak === 1 ? " day" : " days",
          label: "Best streak",
        },
        {
          icon: "timer-outline" as const,
          value: stats.averageSeconds === null ? "–" : formatDuration(stats.averageSeconds),
          unit: "",
          label: "Usually up in",
        },
      ]
    : []

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={colors.moon} />
        </Pressable>
        <Text style={styles.title}>Your mornings</Text>
      </View>

      {status === "loading" && !stats ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.dawn} />
        </View>
      ) : status === "error" && !stats ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mist} />
          <Text style={styles.errorTitle}>Can’t reach the server</Text>
          <Text style={styles.errorText}>
            Start it on your laptop (npm run dev in the server folder) and make sure your phone is
            on the same Wi-Fi. Your wake-ups are safe on the phone in the meantime.
          </Text>
          <Button label="Try again" variant="secondary" onPress={refresh} />
        </View>
      ) : stats ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.mist} />
          }
        >
          {stats.wakeUps === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alarm-outline" size={32} color={colors.mist} />
              <Text style={styles.emptyText}>
                No mornings yet. Finish a wake-up task and it will show up here.
              </Text>
            </View>
          ) : null}

          <View style={styles.tiles}>
            {tiles.map((tile) => (
              <View key={tile.label} style={[styles.tile, { width: tileWidth }]}>
                <Ionicons name={tile.icon} size={18} color={colors.dawn} />
                <Text style={styles.tileValue}>
                  {tile.value}
                  <Text style={styles.tileUnit}>{tile.unit}</Text>
                </Text>
                <Text style={styles.tileLabel}>{tile.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Your last grades</Text>
          <View style={styles.card}>
            {stats.lastGrades.length === 0 ? (
              <Text style={styles.cardHint}>
                Grade your sleep after waking up and your week will appear here.
              </Text>
            ) : (
              <View style={styles.chart}>
                {stats.lastGrades.map((g, i) => (
                  <View key={`${g.date}-${i}`} style={styles.barColumn}>
                    <Text style={[styles.barValue, { color: gradeColor(g.sleep) }]}>{g.sleep}</Text>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(8, (g.sleep / 10) * 110), backgroundColor: gradeColor(g.sleep) },
                      ]}
                    />
                    <Text style={styles.barDay}>{DAYS[dayFrom(g.date).getDay()].slice(0, 2)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {stats.recent.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Recent wake-ups</Text>
              <View style={styles.list}>
                {stats.recent.map((r, i) => {
                  const task = r.task ? taskInfo(r.task) : null
                  return (
                    <View key={r.finishedAt} style={[styles.row, i > 0 && styles.rowDivider]}>
                      <View
                        style={[
                          styles.rowIcon,
                          { backgroundColor: `${task?.color ?? colors.mist}24` },
                        ]}
                      >
                        <Ionicons
                          name={task?.icon ?? "alarm-outline"}
                          size={18}
                          color={task?.color ?? colors.mist}
                        />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowDate}>{shortDate(r.date)}</Text>
                        <Text style={styles.rowMeta}>
                          {[r.alarmTime, task?.title, `done in ${formatDuration(r.seconds)}`]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                      </View>
                      {r.sleep !== null ? (
                        <Text style={[styles.rowGrade, { color: gradeColor(r.sleep) }]}>
                          {r.sleep}/10
                        </Text>
                      ) : (
                        <Text style={styles.rowNoGrade}>No grade</Text>
                      )}
                    </View>
                  )
                })}
              </View>
            </>
          ) : null}

          <View style={styles.footer}>
            <Ionicons name="server-outline" size={14} color={colors.mist} />
            <Text style={styles.footerText}>Saved in the database at {serverAddress()}</Text>
          </View>
        </ScrollView>
      ) : null}
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
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    color: colors.moon,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    padding: space.xl,
  },
  errorTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.moon,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.mist,
    textAlign: "center",
    marginBottom: space.sm,
  },
  content: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl * 2,
    gap: space.md,
  },
  emptyCard: {
    alignItems: "center",
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.dusk,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.mist,
    textAlign: "center",
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm * 1.5,
  },
  tile: {
    gap: 4,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dusk,
  },
  tileValue: {
    fontFamily: fonts.light,
    fontSize: 30,
    color: colors.moon,
    marginTop: space.xs,
  },
  tileUnit: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.mist,
  },
  tileLabel: {
    fontSize: 13,
    color: colors.mist,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.mist,
    marginTop: space.sm,
  },
  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dusk,
  },
  cardHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.mist,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 160,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  barValue: {
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  bar: {
    width: 22,
    borderRadius: 8,
  },
  barDay: {
    fontSize: 12,
    color: colors.mist,
  },
  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.dusk,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: 12,
    paddingHorizontal: space.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.haze,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowDate: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.moon,
  },
  rowMeta: {
    fontSize: 13,
    color: colors.mist,
  },
  rowGrade: {
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  rowNoGrade: {
    fontSize: 13,
    color: colors.mist,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: space.md,
  },
  footerText: {
    fontSize: 12,
    color: colors.mist,
  },
})