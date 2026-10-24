import {
  Sora_300Light,
  Sora_400Regular,
  Sora_600SemiBold,
  useFonts,
} from "@expo-google-fonts/sora"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { View } from "react-native"

import { colors } from "@/constants/theme"
import { AlarmsProvider } from "@/lib/alarms-context"

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Sora_300Light, Sora_400Regular, Sora_600SemiBold })

  // Show a plain night-colored screen for the split second the fonts take to load.
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.night }} />

  return (
    <AlarmsProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.night },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="alarm/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="ring/[id]"
          options={{ presentation: "fullScreenModal", gestureEnabled: false, animation: "fade" }}
        />
      </Stack>
    </AlarmsProvider>
  )
}
