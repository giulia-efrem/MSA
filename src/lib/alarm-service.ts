import { nextRing } from "./time"
import type { Alarm } from "./types"

/**
 * The ONLY file that talks to the phone's real alarm system.
 *
 * Right now it runs in PREVIEW mode. Expo Go can't schedule real system
 * alarms, so nothing rings on its own yet. To try the whole wake-up flow,
 * open an alarm and tap "Test wake-up".
 *
 * Later, in a development build, you replace the insides of these three
 * functions with a native alarm library (AlarmKit on iPhone, AlarmManager
 * on Android) and set IS_PREVIEW to false. No other file needs to change.
 */
export const IS_PREVIEW = true

// Called every time the list of alarms changes.
export async function syncAlarms(alarms: Alarm[]): Promise<void> {
  if (IS_PREVIEW) {
    const upcoming = alarms
      .filter((alarm) => alarm.enabled)
      .map((alarm) => `${alarm.label || "Alarm"} at ${nextRing(alarm).toLocaleString()}`)
    console.log("[alarm-service] preview, would schedule:", upcoming)
    return
  }
  // Real version:
  // 1. Cancel every alarm this app scheduled before.
  // 2. Schedule each enabled alarm at nextRing(alarm).
  // 3. On iPhone, also schedule the backup chain (one alarm every 2 minutes
  //    for 30 minutes), because iOS always lets people press Stop.
}

// Called when the wake-up task is finished.
export async function stopRinging(alarmId: string): Promise<void> {
  if (IS_PREVIEW) {
    console.log("[alarm-service] preview, would cancel the backup chain for", alarmId)
    return
  }
  // Real version: cancel the remaining alarms in this alarm's backup chain.
}

// Schedules the "are you still up?" check a few minutes after the task.
export async function scheduleWakeCheck(alarm: Alarm, minutes = 5): Promise<Date> {
  const at = new Date(Date.now() + minutes * 60_000)
  if (IS_PREVIEW) {
    console.log("[alarm-service] preview, would ring a wake-up check at", at.toLocaleTimeString())
    return at
  }
  // Real version: schedule a one-off alarm at `at` for this alarm.
  return at
}
