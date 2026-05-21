import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const googleServicesPath = resolve(root, "android/app/google-services.json");
const manifestPath = resolve(root, "android/app/src/main/AndroidManifest.xml");
const appGradlePath = resolve(root, "android/app/build.gradle");

const checks = [];

checks.push({
  name: "android/app/google-services.json exists",
  ok: existsSync(googleServicesPath),
  fix: "Download from Firebase Console and place it at android/app/google-services.json",
});

const manifest = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "";
checks.push({
  name: "AndroidManifest has POST_NOTIFICATIONS permission",
  ok: manifest.includes("android.permission.POST_NOTIFICATIONS"),
  fix: "Add <uses-permission android:name=\"android.permission.POST_NOTIFICATIONS\" />",
});
checks.push({
  name: "AndroidManifest has default FCM channel metadata",
  ok: manifest.includes("com.google.firebase.messaging.default_notification_channel_id"),
  fix: "Add com.google.firebase.messaging.default_notification_channel_id metadata in <application>",
});

const appGradle = existsSync(appGradlePath) ? readFileSync(appGradlePath, "utf8") : "";
checks.push({
  name: "android/app/build.gradle applies Google services plugin when config exists",
  ok: appGradle.includes("com.google.gms.google-services"),
  fix: "Ensure com.google.gms.google-services is conditionally or directly applied in android/app/build.gradle",
});

let hasFailure = false;
for (const check of checks) {
  const prefix = check.ok ? "PASS" : "FAIL";
  console.log(`${prefix}: ${check.name}`);
  if (!check.ok) {
    hasFailure = true;
    console.log(`  -> ${check.fix}`);
  }
}

if (hasFailure) {
  process.exitCode = 1;
} else {
  console.log("Android Firebase push prerequisites look ready.");
}
