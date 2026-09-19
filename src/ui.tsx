import React, {useMemo} from "react";
import {usePalette, type Palette} from './theme';
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
  type TextInputProps,
} from "react-native";
export function useTheme(){const theme=usePalette();const s=useMemo(()=>createStyles(theme.colors),[theme.colors]);return {...theme,s};}
export const serif =
  Platform.OS === "ios"
    ? "Georgia"
    : Platform.OS === "web"
      ? "Georgia, serif"
      : "serif";
export function Button({
  children,
  onPress,
  quiet = false,
  disabled = false,
  danger = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  const {colors,s}=useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        quiet
          ? { backgroundColor: "transparent", borderColor: colors.line }
          : { backgroundColor: colors.teal, borderColor: colors.teal },
        { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={{
          color: danger ? colors.danger : quiet ? colors.ink : colors.onAccent,
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const {colors,s}=useTheme();
  return (
    <View style={{ gap: 7, flexGrow: 1 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 94, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
const createStyles = (colors:Palette) => StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  spread: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontFamily: serif, fontSize: 36, color: colors.ink },
  subtitle: { fontFamily: serif, fontSize: 25, color: colors.ink },
  body: { fontSize: 16, lineHeight: 25, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 22, color: colors.muted },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: colors.teal,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    padding: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
    minHeight: 46,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 22,
    gap: 16,
  },
  divider: { height: 1, backgroundColor: colors.line },
  error: { color: colors.danger, fontSize: 14, lineHeight: 22 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.pale,
  },
});
