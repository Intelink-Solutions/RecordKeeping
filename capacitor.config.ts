import type { CapacitorConfig } from "@capacitor/core";

const config: CapacitorConfig = {
  appId: "com.keydoctors.pos",
  appName: "RecordKEEPING",
  webDir: "dist",
  server: {
    androidScheme: "https",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
