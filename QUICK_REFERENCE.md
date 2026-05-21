# Android & iOS Quick Reference Guide

Fast lookup for common commands and configurations for Android/iOS development with Firebase push notifications.

---

## Quick Links

- 📘 Full Guide: [README.md](README.md) — Architecture, detailed setup, troubleshooting
- 📄 Deployment: [DEPLOYMENT.md](DEPLOYMENT.md) — Step-by-step publishing to app stores
- 🔧 Firebase: [console.firebase.google.com](https://console.firebase.google.com)
- 🍎 Xcode: App Store (macOS only)
- 🤖 Android Studio: [developer.android.com/studio](https://developer.android.com/studio)

---

## Essential Commands

### Build & Sync

```bash
# Build web app
npm run build

# Sync web files to native projects (do after every build)
npx cap sync

# Sync only Android
npx cap sync android

# Sync only iOS
npx cap sync ios

# Open in Android Studio
npx cap open android

# Open in Xcode (macOS only)
npx cap open ios
```

### Readiness Checkers

```bash
# Check Android Firebase setup (Windows/Mac/Linux)
npm run check:android:firebase

# Check iOS Firebase setup (macOS only)
npm run check:ios:firebase
```

### Install Plugins

```bash
# Install for Android
npm install @capacitor/android
npx cap add android

# Install for iOS
npm install @capacitor/ios
npx cap add ios

# Install push notifications
npm install @capacitor/push-notifications
npx cap sync
```

### Test on Devices

```bash
# Install APK on device via adb
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Run app and view logs
adb logcat | grep "PushNotification\|Firebase\|capacitor"
```

---

## File Locations

### Android Files

| File | Location | Purpose |
|------|----------|---------|
| Firebase config | `android/app/google-services.json` | ⭐ CRITICAL — Download from Firebase |
| Manifest | `android/app/src/main/AndroidManifest.xml` | Permissions + FCM channel |
| Build config | `android/app/build.gradle` | Dependencies + Google services plugin |
| Signing key | `android/app/keydoctors-pos-key.jks` | Release APK signing (create with keytool) |

### iOS Files

| File | Location | Purpose |
|------|----------|---------|
| Firebase config | `ios/App/GoogleService-Info.plist` | ⭐ CRITICAL — Download & drag into Xcode |
| CocoaPods | `ios/Podfile` | Dependencies (auto-updated) |
| Info.plist | `ios/App/App/Info.plist` | App metadata (auto-generated) |
| Project file | `ios/App/App.xcodeproj` | Xcode project (auto-generated) |

### Backend Files (Laravel)

| File | Location | Purpose |
|------|----------|---------|
| .env | POSadmin root | `FCM_SERVER_KEY=...` |
| Service | `app/Services/PushNotificationService.php` | Sends via FCM |
| Migrations | `database/migrations/` | `device_tokens`, `push_delivery_logs` |
| Models | `app/Models/DeviceToken.php`, `PushDeliveryLog.php` | ORM models |
| API Controller | `app/Http/Controllers/Api/PushNotificationController.php` | `/api/v1/push/*` endpoints |
| Admin Controller | `app/Http/Controllers/Admin/NotificationController.php` | Admin broadcast UI |

### Config Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor configuration (app ID, web dir, plugins) |
| `package.json` | Dependencies + npm scripts |
| `tsconfig.json` | TypeScript configuration |

---

## Firebase Setup Checklist

- [ ] Firebase project created (console.firebase.google.com)
- [ ] Android app registered → `google-services.json` downloaded → placed at `android/app/`
- [ ] iOS app registered → `GoogleService-Info.plist` downloaded → placed at `ios/App/`
- [ ] Service Account created → Private key JSON downloaded
- [ ] FCM Server Key copied to POSadmin `.env` as `FCM_SERVER_KEY`
- [ ] `php artisan config:clear` run in POSadmin

---

## Common Configuration Values

### capacitor.config.ts

```ts
const config: CapacitorConfig = {
  appId: 'com.keydoctors.pos',        // Bundle ID (must match Firebase)
  appName: 'Keydoctors POS',          // Display name
  webDir: 'dist',                     // Web build output (from `npm run build`)
  server: {
    url: undefined,                   // Production: local files
    cleartext: true,                  // Dev only
  },
};
```

### package.json Scripts

```json
{
  "scripts": {
    "npm run build": "Build web app to dist/",
    "npx cap sync": "Copy dist/ to native projects",
    "npx cap open android": "Open Android Studio",
    "npx cap open ios": "Open Xcode",
    "npm run check:android:firebase": "Verify Android Firebase setup",
    "npm run check:ios:firebase": "Verify iOS Firebase setup"
  }
}
```

### API Base URLs

| Context | URL |
|---------|-----|
| Dev (Vite) | Relative paths proxy to production |
| Native app | Must use absolute: `https://keydoctors.veewiss.com/api/...` |
| Browser | Full URL absolute or relative |

---

## Push Notification Flow

```
User Action (Settings or Admin Panel)
        ↓
App calls: POST /api/v1/push/send (or Admin: POST /admin/notifications/send)
        ↓
Backend PushNotificationService validates
        ↓
Queries DeviceToken table (is_active=true)
        ↓
Chunks tokens (500 per batch)
        ↓
Sends to FCM API (fcm.googleapis.com) with server key
        ↓
FCM routes to Google Play Services (Android) or APNs (iOS)
        ↓
Device receives notification
        ↓
Backend logs delivery stats in push_delivery_logs
```

---

## Android APK/AAB Build Steps

1. `npm run build` — Build web
2. `npx cap sync android` — Copy to Android
3. `npx cap open android` — Open Android Studio
4. **Debug APK:**
   - Build → Build APK(s)
   - Output: `android/app/build/outputs/apk/debug/app-debug.apk`
5. **Release AAB (Play Store):**
   - Build → Generate Signed Bundle / APK
   - Select **Bundle**, choose keystore, build **release**
   - Output: `android/app/build/outputs/bundle/release/app-release.aab`

---

## iOS Build Steps

⚠️ **macOS Only**

1. `npm run build` — Build web
2. `npx cap sync ios` — Copy to iOS
3. `npx cap open ios` — Open Xcode
4. **For Testing:**
   - Select simulator or device
   - Click **Run** (▶)
5. **For App Store:**
   - Select **Generic iOS Device**
   - **Product** → **Archive**
   - Archive window → **Distribute App** → **App Store Connect** → **Upload**

---

## Environment Variables Reference

### POSadmin .env

```env
APP_NAME="Keydoctors POS - Admin"
APP_URL=https://keydoctors.veewiss.com
APP_DEBUG=false
APP_KEY=base64:...

# Firebase
FCM_SERVER_KEY=...  # From service account JSON

# Database
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=keydoctors_pos
DB_USERNAME=...
DB_PASSWORD=...

# Mail (if sending notifications)
MAIL_MAILER=smtp
MAIL_FROM_ADDRESS=...
```

### Frontend .env (Optional)

```env
VITE_API_BASE_URL=https://keydoctors.veewiss.com
VITE_APP_NAME=Keydoctors POS
```

---

## Database Query Examples

### Active Device Tokens

```sql
SELECT 
  user_id, 
  platform, 
  COUNT(*) as device_count,
  MAX(last_used_at) as last_active
FROM device_tokens
WHERE is_active = 1
GROUP BY user_id, platform;
```

### Recent Push Deliveries

```sql
SELECT 
  sent_at := created_at,
  title,
  source,
  total_tokens,
  success_count,
  failure_count,
  (success_count / total_tokens * 100) as success_rate
FROM push_delivery_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC;
```

### Failed Deliveries

```sql
SELECT 
  *,
  JSON_EXTRACT(fcm_response, '$.error') as error_message
FROM push_delivery_logs
WHERE failure_count > 0
ORDER BY created_at DESC;
```

---

## Permissions & Roles

### Android Manifest (AndroidManifest.xml)

```xml
<!-- Runtime permission for notifications (API 33+) -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Default FCM notification channel -->
<meta-data
  android:name="com.google.firebase.messaging.default_notification_channel_id"
  android:value="pos-alerts" />
```

### iOS Capabilities (Xcode)

- ✅ **Push Notifications** (required)
- ✅ **Background Modes** → **Remote Notifications** (required)
- ✅ **Apple Push Notification Authentication Key** (in Apple Developer account)

### Laravel Permissions

- `notifications-read`: Can view notifications (admin)
- Users with `role = 'shop-owner'`: Can send push via API
- Users with `role = 'staff'`: Can receive push

---

## Debugging

### View Console Logs

```bash
# Android
adb logcat | grep -i "firebase\|push\|capacitor"

# iOS (in Xcode)
# Bottom panel → View → Show Debug Area (Cmd+Shift+Y)
# Filter: "Firebase" or "Push"
```

### Check Token Registration

```bash
# Terminal - check database
php artisan tinker
>>> App\Models\DeviceToken::latest()->first()
>>> App\Models\DeviceToken::count()
>>> App\Models\DeviceToken::where('is_active', 0)->count()
```

### Verify FCM Server Key

```bash
# Terminal
php artisan tinker
>>> config('services.fcm.server_key')
# Should output key (or error if not set)
```

### View Backend Logs

```bash
# POSadmin
tail -f storage/logs/laravel.log | grep -i "push\|fcm"
```

---

## Common Issues & Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| Push not arriving | 1) Check token in database 2) Check FCM_SERVER_KEY set 3) Check app has notifications enabled |
| White screen on app launch | 1) `npm run build` 2) `npx cap sync` 3) Check API base URL is absolute |
| Android build fails | 1) Check `google-services.json` exists 2) Run `npm run check:android:firebase` |
| iOS build fails | 1) Check `GoogleService-Info.plist` in Xcode 2) Run `cd ios && pod install` |
| Xcode codesigning errors | 1) Select Team ID in Signing & Capabilities 2) Delete derived data (~delete cache) |
| Device tokens not storing | 1) Run `php artisan migrate` 2) Verify database connection 3) Check token endpoint returns 201 |

---

## Deployment Sequence

1. ✅ Firebase project created & configured
2. ✅ Backend migrations run (`php artisan migrate`)
3. ✅ FCM_SERVER_KEY set in POSadmin `.env`
4. ✅ Readiness checks pass (Android & iOS)
5. ✅ Push works in Settings (owner test)
6. ✅ Push works in Admin panel (broadcast)
7. ✅ Signed APK/AAB built (Android)
8. ✅ Signed archive created (iOS)
9. ✅ Accounts enrolled (Google Play $25, Apple App Store $99/yr)
10. ✅ Apps submitted for review

---

## Support Resources

- **Capacitor Docs:** [capacitorjs.com](https://capacitorjs.com)
- **Firebase Docs:** [firebase.google.com/docs](https://firebase.google.com/docs)
- **Android Docs:** [developer.android.com](https://developer.android.com)
- **iOS Docs:** [developer.apple.com](https://developer.apple.com)
- **React Router:** [reactrouter.com](https://reactrouter.com)
- **Tailwind CSS:** [tailwindcss.com](https://tailwindcss.com)

---

**Last updated:** April 17, 2026
