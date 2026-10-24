// All the colors, fonts and spacing in one place.
// Change a value here and the whole app updates.

export const colors = {
  night: "#10132B", // app background, the sky before sunrise
  dusk: "#1A1E40", // raised surfaces (inputs, groups, keys)
  haze: "#2B3060", // hairlines and inactive controls
  moon: "#F1EEF8", // main text
  mist: "#9C9FC4", // secondary text
  dawn: "#FFB27A", // accent, the sunrise
  dawnInk: "#2A1608", // text and icons that sit on top of dawn
  leaf: "#8FE0B5", // success
  rose: "#FF8A99", // errors and delete
}

// Sora is used for times, titles and buttons. Body text uses the phone's own font.
export const fonts = {
  light: "Sora_300Light",
  regular: "Sora_400Regular",
  semibold: "Sora_600SemiBold",
}

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 }

// The skies behind the hero card and the wake-up screens, from top to horizon.
export const sky = {
  night: ["#10132B", "#1A1C44", "#262352"],
  dawn: ["#10132B", "#23204D", "#4E3460", "#A55E6C"],
  morning: ["#1A1E4C", "#43316B", "#A7607A", "#EC9C7C"],
} as const

// The far hills and the dark ground the sun rises behind.
export const hillFar = "#2A2250"
export const ground = "#0B0D22"