import { MD3LightTheme as BaseTheme } from "react-native-paper";

export const AppTheme = {
  ...BaseTheme,
  version: 3,
  colors: {
    ...BaseTheme.colors,

    primary: "#4DABF7",
    secondary: "#74C0FC",
    tertiary: "#A5D8FF",

    primaryContainer: "#D0EBFF",
    inversePrimary: "#E9F7DF",

    background: "#FFFFFF",
    surface: "#F8F9FA",
    outline: "#E5EAF0",
    outlineVariant: "#E9EEF4",
    surfaceVariant: "#EAF3F9",

    error: "#FF6B6B",
    errorContainer: "#FFE3E6",
    onError: "#FFFFFF",
    onErrorContainer: "#7A1C1C",

    onPrimary: "#FFFFFF",
    onBackground: "#000000",
    onSurface: "#303030ff",
    onSurfaceVariant: "#A1A1A1",

    disabled: "#CED4DA",
    placeholder: "#A1A1A1",
    backdrop: "rgba(0,0,0,0.4)",
  },
};

export const TAG_COLORS = [
  "#ec5a5a", //0
  "#F06292", // 1
  "#BA68C8", // 2
  "#9575CD", // 3
  "#7986CB", // 4
  "#64B5F6", // 5
  "#4FC3F7", // 6
  "#4DD0E1", // 7
  "#4DB6AC", // 8
  "#81C784", // 9
  "#AED581", // 10
  "#DCE775", // 11
  "#FFD54F", // 12
  "#FFB74D", // 13
  "#FF8A65", // 14
  "#a8a8a8", // 15
];
