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

    secondaryContainer: "#E9F7DF",

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
  "#FF6B6B",
  "#FF8787",
  "#FFA94D",
  "#FFD43B",
  "#69DB7C",
  "#38D9A9",
  "#4DABF7",
  "#9775FA",
  "#8AADCFFF",
  "#AFC9C3FF",
  "#F06595",
  "#20C997",
];
