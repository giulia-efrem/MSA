import { Ionicons } from "@expo/vector-icons"
import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera"
import { Linking, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui"
import { colors, radius, space } from "@/constants/theme"
import { taskInfo } from "@/lib/tasks"

// Any of these can be used as a wake-up code: a printed QR code,
// or the barcode on your toothpaste, shampoo, coffee...
const CODE_TYPES: BarcodeType[] = ["qr", "ean13", "ean8", "upc_a", "upc_e", "code128", "code39"]

type Props = {
  onScan: (data: string) => void
  paused?: boolean
}

export function CodeScanner({ onScan, paused = false }: Props) {
  const [permission, requestPermission] = useCameraPermissions()

  // Still checking the permission.
  if (!permission) return <View style={styles.box} />

  if (!permission.granted) {
    return (
      <View style={[styles.box, styles.center]}>
        <Ionicons name="camera-outline" size={36} color={colors.mist} />
        <Text style={styles.message}>The camera is needed to scan your code.</Text>
        {permission.canAskAgain ? (
          <Button label="Allow camera" onPress={requestPermission} />
        ) : (
          <Button label="Open settings" onPress={() => Linking.openSettings()} />
        )}
      </View>
    )
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: CODE_TYPES }}
        onBarcodeScanned={paused ? undefined : (result) => onScan(result.data)}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.dusk,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
    padding: space.lg,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.moon,
    textAlign: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  frame: {
    width: 230,
    height: 230,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: taskInfo("scan").color,
  },
})