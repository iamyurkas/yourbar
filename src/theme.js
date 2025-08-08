import { MD3LightTheme as BaseTheme } from "react-native-paper";

export const AppTheme = {
  ...BaseTheme,
  version: 3,
  colors: {
    ...BaseTheme.colors,

    primary: "#4DABF7",
    secondary: "#74C0FC",
    tertiary: "#A5D8FF",

    background: "#FFFFFF",
    surface: "#F8F9FA",
    outline: "#E5EAF0",
    outlineVariant: "#E9EEF4",

    error: "#FF6B6B",
    errorContainer: "#FFE3E6",
    onError: "#FFFFFF",
    onErrorContainer: "#7A1C1C",

    onPrimary: "#FFFFFF",
    onBackground: "#000000",
    onSurface: "#000000",

    disabled: "#CED4DA",
    placeholder: "#A1A1A1",
    backdrop: "rgba(0,0,0,0.4)",
  },
};
