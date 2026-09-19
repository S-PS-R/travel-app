import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./storage";
import { callbackCode } from "./authCallback";

export const googleEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
export function authRedirect() {
  return Platform.OS === "web" ? `${window.location.origin}/` : "wayfarer://auth/callback";
}

let pending: Promise<void> | null = null;
let completedCode: string | null = null;
export async function completeNativeAuth(url: string): Promise<void> {
  const code = callbackCode(url);
  if (!code || code === completedCode || !supabase) return;
  if (pending) return pending;
  pending = (async () => {
    const { error } = await supabase!.auth.exchangeCodeForSession(code);
    if (error) throw new Error("This sign-in link expired or was opened on another device. Please start again here.");
    completedCode = code;
  })().finally(() => { pending = null; });
  return pending;
}

export function listenForAuthLinks(onError: (message: string) => void) {
  if (Platform.OS === "web") return () => {};
  const handle = (url: string) => completeNativeAuth(url).catch((e) => onError(e.message));
  const subscription = Linking.addEventListener("url", ({ url }) => { void handle(url); });
  Linking.getInitialURL().then((url) => { if (url) void handle(url); }).catch(() => onError("Could not open the sign-in link."));
  return () => subscription.remove();
}

export async function signInWithGoogle() {
  if (!supabase || !googleEnabled) throw new Error("Google sign-in is not configured yet.");
  const redirectTo = authRedirect();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== "web" },
  });
  if (error) throw error;
  if (Platform.OS !== "web" && data.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success") await completeNativeAuth(result.url);
    else throw new Error("Sign-in cancelled. You can try again whenever you’re ready.");
  }
}
