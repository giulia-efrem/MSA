import * as Haptics from "expo-haptics"
import { useState } from "react"
import { StyleSheet, Text, View } from "react-native"

import { CodeScanner } from "@/components/code-scanner"
import { colors, space } from "@/constants/theme"
import type { TaskProps } from "@/lib/types"

type Props = TaskProps & {
  code: string // the code registered for this alarm
}

export function ScanTask({ code, onActivity, onComplete }: Props) {
  const [done, setDone] = useState(false)
  const [wrongAt, setWrongAt] = useState(0)

  function handleScan(data: string) {
    if (done) return
    onActivity()
    if (data === code) {
      setDone(true)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onComplete()
      return
    }
    // The camera reports the same wrong code many times per second, so only react every 1.5 s.
    const now = Date.now()
    if (now - wrongAt > 1500) {
      setWrongAt(now)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        Go to the code you registered for this alarm and point the camera at it.
      </Text>
      <View style={styles.camera}>
        <CodeScanner onScan={handleScan} paused={done} />
      </View>
      <Text style={[styles.feedback, wrongAt > 0 && styles.feedbackWrong]}>
        {wrongAt > 0 ? "That’s a different code. Find the one you registered." : " "}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: space.md,
  },
  instructions: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.moon,
  },
  camera: {
    flex: 1,
  },
  feedback: {
    fontSize: 15,
    color: colors.mist,
    textAlign: "center",
    minHeight: 22,
  },
  feedbackWrong: {
    color: colors.rose,
  },
})
