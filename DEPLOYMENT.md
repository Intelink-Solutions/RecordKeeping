# Android & iOS Deployment Guide

Complete step-by-step guide for deploying Keydoctors POS mobile app to Android and iOS with Firebase push notifications.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Project Setup](#firebase-project-setup)
3. [Android Deployment](#android-deployment)
4. [iOS Deployment](#ios-deployment)
5. [Backend Configuration](#backend-configuration)
6. [Testing Push Notifications](#testing-push-notifications)
7. [Publishing to App Stores](#publishing-to-app-stores)
8. [Post-Launch Monitoring](#post-launch-monitoring)

---

## Prerequisites

### Common
- Node.js 18+ and npm
- Git
- Google account (for Firebase)
- Code editor (VS Code recommended)

### Android Only
- Android Studio
- Java 11+ (usually bundled with Android Studio)
- **OS:** Windows, macOS, or Linux

### iOS Only
- **macOS** (not available on Windows/Linux)
- Xcode 13+ from App Store
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account ($99/year for publishing)

---

## Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create Project"**
3. Enter name: `Keydoctors POS`
4. Geographic location: Your region
5. Enable Google Analytics: **No** (optional for this app)
6. Click **Create Project** and wait 30 seconds

### Step 2: Enable Firebase Messaging

1. In Firebase Console, select your project
2. Go to **Build** menu on left → **Cloud Messaging**
3. Click **Enable** (should already be on, but verify)

### Step 3: Create Service Account for Backend

This allows your POSadmin Laravel backend to send push notifications.

1. Go to **Project Settings** (⚙️ gear icon, top-right)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. A JSON file downloads → **Save securely** (contains sensitive credentials)
5. In POSadmin `.env`:
   ```
   FCM_SERVER_KEY=<paste the complete JSON or just the key depending on Firebase format>
   ```
   > Note: Firebase recently changed FCM API authentication. Check Firebase console for the exact field name to use.
6. Run `php artisan config:clear` in POSadmin

### Step 4: Keep Firebase Project ID Handy

You'll need it for both Android and iOS. Find at:
- **Project Settings** → **General** tab → **Project ID**
- Format: `keydoctors-pos-xxxxx`

---

## Android Deployment

### Prerequisites
- Android Studio installed
- Java 11+ available

### A. Generate Signing Key

Before first production build, create a signing key (required for Play Store):

```bash
cd android/app
keytool -genkey -v -keystore keydoctors-pos-key.jks -keyalg RSA \
  -keysize 2048 -validity 10000 -alias keydoctors-key

# Prompts for password and details — remember the password!
```

Save `keydoctors-pos-key.jks` in version control (.gitignore) or secure location.

### B. Prepare Android Firebase Configs

In Firebase Console:

1. **Add Android App**
   - Click **Project Settings** (⚙️) → **Your apps**
   - Click **Add app** → Select **Android**
   - Fill in:
     - **Package name:** `com.keydoctors.pos`
     - **App nickname:** `Keydoctors POS`
   - Click **Register app**

2. **Download google-services.json**
   - Click it when prompted during registration
   - Save to: `android/app/google-services.json`
   - This file is critical; don't skip or app won't register for push

3. **Verify Android Manifest**
   - Ensure `android/app/src/main/AndroidManifest.xml` has:
     ```xml
     <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
     <meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="pos-alerts" />
     ```

### C. Run Android Readiness Check

```bash
npm run check:android:firebase
```

Should output all ✅ (green checks). If not, fix immediately.

### D. Build APK/AAB

```bash
npm run build
npx cap sync android
npx cap open android
```

In Android Studio:

**For APK (testing):**
1. **Build** → **Build APK(s)**
2. Wait; output: `android/app/build/outputs/apk/debug/app-debug.apk`
3. Can install on device/emulator directly

**For AAB (Play Store):**
1. **Build** → **Generate Signed Bundle / APK**
2. Select **Bundle (AAB)**
3. Choose your keystore (`keydoctors-pos-key.jks`)
4. Build type: **release**
5. Output: `android/app/build/outputs/bundle/release/app-release.aab`

### E. Test on Android Device

```bash
# Install test APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Or open device in Android Studio Run configuration
```

1. Open app
2. Go to **Settings**
3. Toggle **Enable Push Notifications** ON
4. Grant permission when OS asks
5. Should see "Push notifications enabled" confirmation

---

## iOS Deployment

### Prerequisites
- macOS
- Xcode from App Store
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account (for distribution)

### A. Prepare iOS Firebase Configs

In Firebase Console:

1. **Add iOS App**
   - Go to **Project Settings** (⚙️) → **Your apps**
   - Click **Add app** → Select **iOS**
   - Fill in:
     - **iOS Bundle ID:** `com.keydoctors.pos`
     - **App nickname:** `Keydoctors POS`
   - Click **Register app**

2. **Download GoogleService-Info.plist**
   - Click it when prompted
   - Save to: `ios/App/GoogleService-Info.plist`
   - Then run:
     ```bash
     cd ios
     pod install
     ```
   - CocoaPods auto-detects plist and includes Firebase SDKs

### B. Run iOS Readiness Check

**Note: Only works on macOS!**

```bash
npm run check:ios:firebase
```

Should output all ✅. If not, fix immediately.

### C. Configure Signing in Xcode

```bash
npx cap open ios
```

1. Select **App** project on left
2. Select **App** target
3. Go to **Signing & Capabilities**
4. Choose **Team** (your Apple Developer account)
5. Bundle ID: `com.keydoctors.pos`
6. Xcode auto-provisions

**Add Capabilities:**
1. Click **+ Capability**
2. Search and add:
   - **Push Notifications**
   - **Background Modes** → Check **Remote Notifications**

### D. Enable APNs in Apple Developer

(Only needed for production/distribution)

1. Go to [developer.apple.com](https://developer.apple.com) → Sign in
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → Find `com.keydoctors.pos`
4. Enable **Push Notifications**
5. Create/update **APNs certificate** (Apple's bridge to Firebase)

### E. Build for Simulator/Device

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select simulator or connected device
2. Click **Run** (▶) button
3. Wait for build (~1-2 minutes)

### F. Test on iOS Device

1. Open app
2. Go to **Settings**
3. Toggle **Enable Push Notifications** ON
4. Grant permission when OS asks
5. Should see "Push notifications enabled" confirmation

---

## Backend Configuration

### Step 1: Run Migrations

In POSadmin:

```bash
php artisan migrate
```

Creates:
- `device_tokens` table (stores mobile tokens)
- `push_delivery_logs` table (audit trail)

### Step 2: Configure FCM Server Key

In POSadmin `.env`:

```env
FCM_SERVER_KEY=<paste from Firebase Service Account JSON>
APP_URL=https://keydoctors.veewiss.com
```

Run:
```bash
php artisan config:clear
```

### Step 3: Verify Backend Ready

```bash
# Check tables created
php artisan migrate:status | grep push

# Check config loaded
php artisan tinker
>>> config('services.fcm.server_key')
// Should return key, not null
>>> exit
```

---

## Testing Push Notifications

### A. From App Settings (Owner Role)

1. **Android/iOS:** Launch app → Go to Settings
2. **Enable Push Notifications** if not already
3. Scroll to **Send Test Push** section
4. Choose:
   - **All Staff:** Sends to all staff users
   - **Selected Staff:** Check specific users
5. Enter **Title** and **Body**
6. Click **Send Push**

**Expected:**
- Notification appears on staff devices
- Success toast in app
- History logged in admin panel

### B. From Admin Panel (Broadcast)

1. Log into POSadmin
2. Go to **Notifications**
3. Fill **Send Push Notification** form:
   - **Target Business:** (optional, blank = all)
   - **Targeting Mode:** Broadcast or Specific Users
   - **Title, Body:** Enter message
4. Click **Send Push**

**Expected:**
- Notifications appear on selected devices
- Success message shows stats (success/failure/total)
- Log appears in Delivery History

### C. Troubleshoot Failed Delivery

**If push doesn't arrive:**

1. Check app has push enabled: Settings → Notifications toggle
2. Check device tokens stored: POSadmin database
   ```sql
   SELECT * FROM device_tokens WHERE is_active = 1;
   ```
3. Check FCM key valid:
   ```bash
   php artisan tinker
   >>> config('services.fcm.server_key')
   ```
4. Check delivery logs for errors:
   - POSadmin → Notifications → Delivery History
   - Look for low success rate or errors in FCM response

---

## Publishing to App Stores

### Google Play Store

#### Requirements
- Signed AAB file (created above)
- 512×512 PNG icon
- 2+ screenshots per device type
- Privacy policy URL
- Google Play Developer account ($25 one-time)

#### Steps

1. **Enroll:**
   - Go to [play.google.com/console](https://play.google.com/console)
   - Pay $25 developer fee
   - Set up account

2. **Create App:**
   - Click **Create App**
   - Name: `Keydoctors POS`
   - Category: Business
   - Content rating: Fill questionnaire

3. **Upload AAB:**
   - Go to **Build** (left menu)
   - **App bundles and APKs** → **App bundles**
   - Click **Create new release**
   - Upload `app-release.aab`
   - Add release notes: "Initial release"
   - Click **Save and Review**

4. **Fill Listing:**
   - Short description, full description
   - Upload screenshots (take from emulator)
   - Select privacy policy URL
   - Content rating

5. **Review & Publish:**
   - Click **Review** (right sidebar)
   - All checks should pass (green ✓)
   - If errors, fix and retry
   - Click **Manage releases** → **Production** → **Review release**
   - Click **Confirm rollout**

**Typical review time:** 1-2 hours

### Apple App Store

#### Requirements
- macOS + Xcode
- Signed `.ipa` file (archived from Xcode)
- 1024×1024 PNG icon
- 2+ screenshots per device type
- Privacy policy URL
- Apple Developer account ($99/year)

#### Steps

1. **Enroll:**
   - Go to [developer.apple.com](https://developer.apple.com)
   - Pay $99/year
   - Create Apple ID if needed

2. **Create App in App Store Connect:**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Click **My Apps** → **+** button
   - Create **New App**
   - Name: `Keydoctors POS`
   - Bundle ID: `com.keydoctors.pos`
   - SKU: (any value)

3. **Configure Signing in Xcode:**
   - In Xcode, **Product** → **Scheme** → **Edit Scheme**
   - Select **Release** build configuration
   - **Build Settings** → Search "signing"
   - Signing Certificate: Select distribution certificate
   - Provisioning Profile: Select App Store profile

4. **Archive App:**
   - Select **Generic iOS Device** (not simulator)
   - **Product** → **Archive**
   - Wait for archive to complete

5. **Upload Archive:**
   - In Archives window, select latest
   - Click **Distribute App**
   - Select **App Store Connect** → **Upload**
   - Sign in with Apple ID
   - Select team, confirm

6. **Fill Listing in App Store Connect:**
   - Screenshots (must be per-device: iPhone 6.7", 6.5", 5.8", 5.5")
   - Description, keywords, support URL
   - Privacy policy
   - Age rating

7. **Submit for Review:**
   - Click **Add for Review**
   - Select version to review
   - Fill questionnaire (export compliance, etc.)
   - Click **Submit for Review**

**Typical review time:** 1-2 days (sometimes up to 5 if rejected)

---

## Post-Launch Monitoring

### Track App Usage

POSadmin admin panel:
- **Notifications → Delivery History** — See all push sends + success rates
- Success rate > 95% is ideal
- Investigate failures if rate drops below 90%

### Monitor Device Tokens

Check active device counts:
```bash
php artisan tinker
>>> App\Models\DeviceToken::where('is_active', true)->count()
// Should grow over time as users install
```

### Watch Backend Logs

FCM errors logged in `storage/logs/laravel.log`:
```bash
tail -f storage/logs/laravel.log | grep -i "fcm\|push"
```

---

## Troubleshooting Deployment

### Android Build Errors

| Error | Fix |
|-------|-----|
| `google-services.json not found` | Run `npm run check:android:firebase` → download file from Firebase → place at `android/app/` |
| Gradle sync fails | Close Android Studio, delete `android/.gradle`, reopen |
| APK install fails on device | Ensure device Android version matches minimum in `build.gradle` |
| White screen after launch | Check network access; make sure API base URL is absolute URL in api.ts |

### iOS Build Errors

| Error | Fix |
|-------|-----|
| `GoogleService-Info.plist not found` | Download from Firebase, drag into Xcode at `ios/App/App/`, check "Copy items if needed" |
| Pod dependency errors | Run `cd ios && pod install --repo-update` |
| Signing errors in Xcode | Go to **Signing & Capabilities**, select correct Team ID |
| "Certificate not valid" during archive | Create new certificate in Apple Developer account, add to Xcode |

### Push Not Arriving

| Issue | Debugging |
|-------|-----------|
| Token not registered | Check app toggle at Settings; look in database for tokens |
| Send fails silently | Check POSadmin delivery logs; look for FCM errors in laravel.log |
| Logs show 0 success | Verify FCM_SERVER_KEY is correct; run `php artisan config:clear` |

---

## Final Checklist

- [ ] Firebase project created
- [ ] Android project set up with google-services.json
- [ ] iOS project set up with GoogleService-Info.plist
- [ ] Backend migrations run (`php artisan migrate`)
- [ ] FCM_SERVER_KEY configured in POSadmin .env
- [ ] Android readiness check passes (`npm run check:android:firebase`)
- [ ] iOS readiness check passes (`npm run check:ios:firebase`)
- [ ] Push notifications work in Settings (app test)
- [ ] Push notifications work in Admin panel (broadcast)
- [ ] Delivery history shows logs
- [ ] Signed APK/AAB ready for Play Store
- [ ] Signed `.ipa` ready for App Store
- [ ] Privacy policy URL configured
- [ ] Listings filled with screenshots and descriptions
- [ ] Apps submitted for review

---

For support, check README.md sections on Troubleshooting or contact Firebase/Apple support for platform-specific issues.
