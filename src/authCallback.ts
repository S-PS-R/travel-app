// Accept only our registered callback; never import tokens from arbitrary links.
export function callbackCode(value: string): string | null {
  const url = new URL(value);
  if (url.protocol !== "wayfarer:" || url.hostname !== "auth" || url.pathname !== "/callback") return null;
  if (url.searchParams.has("error")) throw new Error("Sign-in was not completed. Please try again.");
  return url.searchParams.get("code");
}
