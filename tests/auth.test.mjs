import test from "node:test";
import assert from "node:assert/strict";
import { callbackCode } from "../src/authCallback.ts";

test("native auth accepts only a code on the exact registered callback", () => {
  assert.equal(callbackCode("wayfarer://auth/callback?code=valid-code"), "valid-code");
  for (const url of [
    "https://evil.example/auth/callback?code=stolen",
    "wayfarer://evil/callback?code=stolen",
    "wayfarer://auth/callback/other?code=stolen",
    "wayfarer://auth/callback#access_token=untrusted&refresh_token=untrusted",
  ]) assert.equal(callbackCode(url), null);
  assert.throws(() => callbackCode("wayfarer://auth/callback?error=access_denied"), /not completed/);
});
