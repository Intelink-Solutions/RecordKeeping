# Keydoctors POS — Mobile App

A React + TypeScript + Vite POS application with shadcn/ui, designed for mobile-first usage. Connects to a Laravel backend at `https://keydoctors.veewiss.com`. Supports Android and iOS with Firebase Cloud Messaging (FCM) push notifications.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | React 18 + TypeScript               |
| Build       | Vite 5 (SWC)                        |
| UI          | shadcn/ui + Tailwind CSS            |
| Routing     | React Router v6                     |
| State       | localStorage + live API sync        |
| Backend     | FCM Server Key | Authentication |
| Database    | Device Token storage | Push logs |

---

## Development

### Prerequisites
- Node.js 18+ and npm

### Install & Run
```bash
npm install
npm run dev
```
Dev server starts at `http://localhost:8080`. API requests are proxied to production via `vite.config.ts`.

### Build for Production
```bash
npm run build
```
Output goes to `dist/` folder.

### Run Tests
```bash
npm test
```

---

## Project Structure

```
src/
├── components/         # Shared components (CrudListPage, BottomNav, PageHeader, etc.)
│   └── ui/             # shadcn/ui primitives
├── hooks/              # Custom hooks (use-mobile, use-toast, use-hrm-live-list, etc.)
├── lib/                # Utilities (store.ts, api.ts, currency.ts, live-sync.ts)
├── pages/              # All page components
│   ├── hrm/            # HRM module pages (Employees, Leaves, Attendance, etc.)
│   └── reports/        # Report pages
└── assets/             # Static assets
```

### Key Files
- **`src/lib/store.ts`** — localStorage-based data store with all interfaces (Product, Sale, Employee, Leave, etc.)
- **`src/lib/api.ts`** — API helper functions (apiGet, apiPost, apiCreateHrmResource, etc.)
- **`src/components/CrudListPage.tsx`** — Reusable CRUD list component used by all HRM pages
- **`vite.config.ts`** — Dev proxy configuration pointing to production server

---

## API Endpoints

### Auth
- `POST /api/v1/sign-in` — Login (returns Sanctum token)

### HRM (9 resources)
All under `/api/v1/hrm/`:
| Resource       | Endpoints                              |
|----------------|----------------------------------------|
| departments    | GET / POST / PUT /{id} / DELETE /{id}  |
| designations   | GET / POST / PUT /{id} / DELETE /{id}  |
| shifts         | GET / POST / PUT /{id} / DELETE /{id}  |
| employees      | GET / POST / PUT /{id} / DELETE /{id}  |
| leave-types    | GET / POST / PUT /{id} / DELETE /{id}  |
| leaves         | GET / POST / PUT /{id} / DELETE /{id}  |
| holidays       | GET / POST / PUT /{id} / DELETE /{id}  |
| attendance     | GET / POST / PUT /{id} / DELETE /{id}  |
| payroll        | GET / POST / PUT /{id} / DELETE /{id}  |

### Business Data
- `GET /public/api/v1/business-profile`
- `GET /api/v1/products`, `/customers`, `/suppliers`, `/sales`, `/purchases`, etc.

---

## Converting to Android & iOS with Firebase Push Notifications

This guide walks through converting the web app to native Android and iOS apps with Firebase Cloud Messaging (FCM) push notification support.

### Overview

- **Capacitor 7** wraps the React web app in a native WebView, giving access to native APIs
- **Firebase** provides cloud messaging infrastructure
- **Push Notifications Plugin** handles device token registration with the backend
- **App-side Backend API** (`ApiController` on Laravel) stores and manages tokens
- **Admin Panel Backend** (NotificationController on Laravel) sends broadcasts

**Architecture:**
```
Firebase Console (Project Settings)
         ↓
   FCM Server Key
         ↓
   Laravel Backend (PushNotificationService)
         ↓
   FCM API (fcm.googleapis.com)
         ↓
   Google Play Services (Android) / APNs (iOS)
         ↓
   Native App receives push
```

---

## Part 1: Android Firebase Setup

### Prerequisites

- Android Studio (or Android SDK tools)
- Java 11+ installed
- Google account (for Firebase Console)
- Windows, macOS, or Linux

### Step 1.1: Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create Project"** → Follow prompts
3. Give it a name: `Keydoctors POS`
4. **Disable** "Enable Google Analytics" (optional)
5. Click **Create Project** and wait for setup to complete

### Step 1.2: Register Android App in Firebase

1. In Firebase Console, click **Add App** → Choose **Android**
2. Fill in:
   - **Package name:** `com.keydoctors.pos` (matches `capacitor.config.ts`)
   - **App nickname:** `Keydoctors POS Android`
   - Leave SHA-1 blank for now (add after signing setup)
3. Click **Register App**
4. **Download `google-services.json`** → Save to `android/app/`
5. Skip the "Add Firebase SDK" instructions (Capacitor handles this)

### Step 1.3: Download Server Key for Backend

1. In Firebase Console, go to **Project Settings** (gear icon, top-right)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key** → A JSON file downloads
4. Open the JSON and copy the `private_key_id` value
5. In POSadmin `.env`, set:
   ```
   FCM_SERVER_KEY=<paste the entire file or just the key—check Firebase docs>
   ```
6. Run `php artisan config:clear` in POSadmin

> **Note:** Firebase changed their FCM API from "Server Key" to service account credentials. The exact value to use depends on your Firebase project setup. See Firebase docs for latest authentication method.

### Step 1.4: Update Android Manifest

The app manifest already includes:
- `POST_NOTIFICATIONS` permission (runtime notification permission)
- Default FCM channel metadata (`pos-alerts`)

Verify in `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest ...>
    <!-- Runtime permission for showing notifications (API 33+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Application config -->
    <application ...>
        <!-- Default FCM channel for notifications -->
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="pos-alerts" />
        <!-- ... rest of config -->
    </application>
</manifest>
```

### Step 1.5: Run Android Firebase Readiness Checker

Before building, verify all Firebase configs are in place:

```bash
npm run check:android:firebase
```

Expected output:
```
✓ google-services.json found
✓ AndroidManifest has POST_NOTIFICATIONS permission
✓ AndroidManifest has default_notification_channel_id metadata
✓ build.gradle has Google services plugin
```

**If any checks fail**, fix the issue before building.

### Step 1.6: Build and Deploy to Android

```bash
# Build web assets
npm run build

# Sync to native project
npx cap sync android

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Select a device or emulator
3. Click **Run** (▶) button
4. App installs and launches

**For signed APK/AAB (for Play Store):**
1. Go to **Build → Generate Signed Bundle / APK**
2. Create or select a keystore
3. Choose **release** build type
4. Output at: `android/app/build/outputs/apk/release/app-release.apk`

---

## Part 2: iOS Firebase Setup (macOS only)

### Prerequisites

- **macOS** (cannot develop iOS on Windows/Linux)
- Xcode 13+ installed from App Store
- CocoaPods: `sudo gem install cocoapods`
- Google account
- Apple Developer account (for signing)

### Step 2.1: Create Firebase Project (Shared)

Same as Android Step 1.1 — create ONE Firebase project for both platforms.

### Step 2.2: Register iOS App in Firebase

1. In Firebase Console, click **Add App** → Choose **iOS**
2. Fill in:
   - **iOS Bundle ID:** `com.keydoctors.pos` (matches `capacitor.config.ts`)
   - **App nickname:** `Keydoctors POS iOS`
3. Click **Register App**
4. **Download `GoogleService-Info.plist`**
5. Drag into Xcode: `ios/App/App/` folder (build phase auto-adds it)
   - Make sure **"Copy items if needed"** is checked in Xcode
   - Make sure **"Add to targets: App"** is checked
6. Skip the "Add Firebase SDK" instructions (Capacitor + CocoaPods handle this)

### Step 2.3: Update CocoaPods for Firebase

After adding the iOS platform, update the Podfile to include Firebase:

```bash
cd ios
pod install
```

CocoaPods should automatically detect `GoogleService-Info.plist` and include Firebase SDKs. If it doesn't, manually add to `ios/Podfile`:

```ruby
target 'App' do
  capacitor_pods

  # Firebase pods (auto-added if GoogleService-Info.plist exists)
  pod 'Firebase/Messaging'
  
  post_install do |installer|
    # ... existing post_install
  end
end
```

Then run `pod install` again.

### Step 2.4: Configure iOS Signing & Capabilities in Xcode

```bash
# Open in Xcode
npx cap open ios
```

1. Select **App** project in left sidebar
2. Select **App** target
3. Go to **Signing & Capabilities** tab:
   - Choose your **Team ID** (Apple Developer account)
   - Xcode auto-adds provisioning profiles
4. Click **+ Capability** and add **Push Notifications**
5. Add **Background Modes** → Enable **Remote Notifications**

### Step 2.5: Enable APNs Certificate in Apple Developer Account

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in with your Apple Developer account
3. Go to **Certificates, Identifiers & Profiles**
4. Select **Identifiers** → Find `com.keydoctors.pos`
5. Enable **Push Notifications** capability
6. Create a new **APNs certificate** (Apple handles the FCM-to-APNs bridge)

### Step 2.6: Run iOS Firebase Readiness Checker

```bash
npm run check:ios:firebase
```

Expected output:
```
✓ ios/ directory found
✓ Podfile found
✓ Xcode project found
✓ Info.plist found
✓ GoogleService-Info.plist found
✓ @capacitor/push-notifications installed
```

**If any checks fail**, fix the issue before building.

### Step 2.7: Build and Deploy to iOS

```bash
# Build web assets
npm run build

# Sync to native project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select a simulator or connected device
2. Click **Run** (▶) button
3. App builds, installs, and launches

**For App Store distribution:**
1. Select **Generic iOS Device** (not simulator)
2. Go to **Product → Archive**
3. Choose **Distribute App**
4. Follow upload steps to App Store Connect

---

## Part 3: Testing Push Notifications

### 3.1: Enable Push in App (Mobile)

1. Install and run the app on Android or iOS device
2. Go to **Settings** page
3. Scroll to **Notifications** section
4. Toggle **Enable Push Notifications** ON
5. Grant permission when OS asks

The app will now:
- Register device token with backend API
- Store token in database
- Display confirmation toast

### 3.2: Send Test Push from Settings (Owner Only)

For app owners (role = 'shop-owner'):

1. In Settings, scroll to **Send Test Push** section
2. Choose **Recipient Mode**:
   - **All Staff**: Sends to all registered staff users
   - **Selected Staff**: Checkboxes to pick specific users
3. Enter **Title** and **Body**
4. Click **Send Push**

Backend API:
- Queries device tokens from database
- Calls FCM API
- Device receives notification in background/foreground

### 3.3: Send Test Push from Admin Panel (Broadcasting)

1. Log into POSadmin as admin
2. Go to **Notifications** → **Send Push**
3. Choose **Targeting Mode**:
   - **Broadcast (All Staff)**: All users in selected business
   - **Specific Users**: Checkboxes to choose staff members
4. Enter **Business** (optional — all if blank)
5. Enter **Title** and **Body**
6. Click **Send Push**

Response shows success/failure stats.

### 3.4: View Delivery History

1. In POSadmin → **Notifications** → **Delivery History**
2. Filter by:
   - Business
   - Source (admin or api)
   - Date range
3. Table shows delivery stats and success rate

---

## Part 4: Deployment & Publishing

### Android Play Store

#### Requirements
- Signed APK or AAB (.aab preferred)
- 512x512 PNG icon
- Screenshots (min 2)
- Description, privacy policy, contact info
- Google Play Developer account ($25 one-time)

#### Steps
1. Create signed APK/AAB via Android Studio (Build → Generate Signed Bundle)
2. Enroll at [play.google.com/console](https://play.google.com/console)
3. Create new app, fill listing details
4. Upload AAB to "Production" track
5. Submit for review (typically 1-2 hours)

### iOS App Store

#### Requirements
- Signed .ipa via Xcode Archive
- 1024x1024 PNG icon
- Screenshots (min 2 for each device size)
- Description, privacy policy, contact info
- Apple Developer account ($99/year)
- Mac for building/uploading

#### Steps
1. Enroll at [developer.apple.com](https://developer.apple.com)
2. Create app in App Store Connect
3. In Xcode: **Product → Archive**
4. Click **Distribute App** → Select App Store
5. Upload to App Store Connect
6. Submit for review (typically 1-2 days)

---

## Part 5: Readiness Checkers

### Android Firebase Readiness

```bash
npm run check:android:firebase
```

Checks:
1. `google-services.json` exists in `android/app/`
2. `AndroidManifest.xml` has `POST_NOTIFICATIONS` permission
3. `AndroidManifest.xml` has default FCM channel metadata
4. `build.gradle` has Google services plugin

**Fixes provided in output** if any check fails.

### iOS Firebase Readiness

```bash
npm run check:ios:firebase
```

Checks:
1. `ios/` directory exists
2. `Podfile` exists (CocoaPods setup)
3. Xcode project present
4. `Info.plist` exists
5. `GoogleService-Info.plist` exists in `ios/App/`
6. `@capacitor/push-notifications` installed
7. `capacitor.config.ts` configured

**Note:** iOS readiness can only run on macOS (Xcode and CocoaPods are macOS-only).

---

## Part 6: Backend Setup (POSadmin Laravel)

The mobile app requires backend infrastructure to:
1. Receive and store device tokens from mobile clients
2. Send push notifications via Firebase
3. Track delivery history

### 6.1: Run Database Migrations

In the POSadmin project:

```bash
php artisan migrate
```

This creates two critical tables:
- **`device_tokens`** — Stores mobile device tokens, platform, and active status
- **`push_delivery_logs`** — Audit trail of all push sends (success/failure stats)

### 6.2: Configure Firebase Server Key

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → Your Project
2. Click **Project Settings** (gear icon, top-right)
3. Click **Service Accounts** tab
4. Click **Generate New Private Key** (if not already created)
5. In POSadmin `.env`:
   ```
   FCM_SERVER_KEY=<paste the entire private key or just the identifier>
   ```
   > Check Firebase docs for the exact format; this may change as Firebase migrates to the newer FCM API.

6. Run:
   ```bash
   php artisan config:clear
   ```

### 6.3: API Endpoints for Mobile App

The mobile app calls these endpoints to manage push tokens:

#### Register Token
```
POST /api/v1/push/tokens
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcmDeviceToken....",
  "platform": "android" | "ios" | "web",
  "device_name": "Samsung Galaxy S21",
  "app_version": "1.0.0"
}

Response: 201
{
  "message": "Push token registered successfully.",
  "data": {
    "id": 123,
    "platform": "android",
    "is_active": true
  }
}
```

#### Unregister Token
```
DELETE /api/v1/push/tokens
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcmDeviceToken...."
}

Response: 200
{
  "message": "Push token unregistered successfully."
}
```

#### Send Push (Shop-Owner Only)
```
POST /api/v1/push/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Urgent: Low Stock Alert",
  "body": "Product XYZ is running low. Consider reordering.",
  "user_ids": [1, 2, 3]  // Optional: target specific users. If omitted, sends to all staff
}

Response: 200
{
  "message": "Push send completed.",
  "data": {
    "total_tokens": 15,
    "success": 14,
    "failure": 1,
    "message": "Push send completed."
  }
}
```

### 6.4: Admin Broadcasting Endpoints

Admin panel uses these endpoints to broadcast messages:

#### Send Broadcast (Admin with notifications-read permission)
```
POST /admin/notifications/send
Authorization: Bearer <token>
Content-Type: application/x-www-form-urlencoded

Form Data:
- business_id: (optional, blank = all businesses)
- recipient_user_ids[]: (optional, checkboxes for specific users)
- title: "Announcement Title" (required)
- body: "Message body" (optional)

Response: 302 Redirect with flash success/error
Flash: "Push sent. Success: 14, Failure: 1, Tokens: 15"
```

#### View Delivery History
```
GET /admin/notifications/history?business_id=1&source=admin&from_date=2026-04-01&to_date=2026-04-30
Authorization: Bearer <token>

Response: HTML table with pagination
Columns: Sent At, Business, Title, Sent By, Stats, Success Rate, Source
```

### 6.5: Database Schema

#### `device_tokens` Table
```sql
CREATE TABLE device_tokens (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  business_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  platform ENUM('android', 'ios', 'web') NOT NULL,
  token TEXT NOT NULL UNIQUE,
  device_name VARCHAR(255),
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (business_id, is_active),
  INDEX (user_id, is_active)
);
```

#### `push_delivery_logs` Table
```sql
CREATE TABLE push_delivery_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  business_id BIGINT NOT NULL,
  sent_by_user_id BIGINT,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSON,
  total_tokens INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  recipient_user_ids JSON,
  fcm_response JSON,
  source ENUM('admin', 'api', 'internal') DEFAULT 'admin',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX (business_id, created_at),
  INDEX (sent_by_user_id, created_at)
);
```

### 6.6: Key Models & Services

#### Models
- **`App\Models\DeviceToken`** — Represents a mobile device token
- **`App\Models\PushDeliveryLog`** — Audit log of push deliveries

**Relationships:**
```php
DeviceToken::user()          // BelongsTo User
DeviceToken::business()      // BelongsTo Business
PushDeliveryLog::business()  // BelongsTo Business
PushDeliveryLog::sentByUser()// BelongsTo User
```

#### Service
- **`App\Services\PushNotificationService`** — Centralized FCM sender
  - `send(tokens[], title, body, data[], logOptions)` — Sends via FCM, chunks tokens (500/batch), logs delivery

#### Controllers
- **`App\Http\Controllers\Api\PushNotificationController`** — Mobile app API
  - `registerToken()` — Store device token
  - `unregisterToken()` — Deactivate token
  - `send()` — Send push (shop-owner only, scoped to business)

- **`App\Http\Controllers\Admin\NotificationController`** — Admin broadcast UI
  - `mtIndex()` — Show notifications + send form (includes staff list for targeting)
  - `pushHistory()` — Delivery history with filters
  - `send()` — Execute broadcast (validates business/title/body, queries tokens, logs)

### 6.7: Verification Steps

1. **Check migrations ran:**
   ```bash
   php artisan migrate:status | grep push
   ```
   Expected: `Migrated  2026_04_17_120000_create_device_tokens_table`
   Expected: `Migrated  2026_04_17_130000_create_push_delivery_logs_table`

2. **Check FCM key configured:**
   ```bash
   php artisan tinker
   >>> config('services.fcm.server_key')
   // Should output the key or throw error if missing
   ```

3. **Test API endpoint:**
   ```bash
   curl -X POST https://keydoctors.veewiss.com/api/v1/push/tokens \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"token":"test123","platform":"android","device_name":"Test"}'
   ```
   Expected: 201 response with token ID

4. **Check admin panel:**
   - Log in as admin
   - Go to **Notifications** page
   - Should see "Send Push Notification" form
   - Should see "Delivery History" tab
   - Should see staff list for targeting

---

## Troubleshooting

### Android Issues

| Issue | Fix |
|-------|-----|
| `google-services.json` not found | Download from Firebase Console → Place at `android/app/google-services.json` |
| Gradle build fails | Run `npx cap sync android` then **Build → Clean Project** in Android Studio |
| White screen on launch | Check `capacitor.config.ts` has `webDir: 'dist'` and you ran `npm run build` |
| Push token not registering | Check backend `.env` has `FCM_SERVER_KEY` set; run `php artisan config:clear` |
| Permission denied toast | Device may have disabled notifications in Settings → Permissions |
| Firebase not initializing | Clear app cache: **Settings → Apps → Keydoctors POS → Storage → Clear Cache** |

### iOS Issues

| Issue | Fix |
|-------|-----|
| `GoogleService-Info.plist` not found | Download from Firebase → Drag into Xcode `ios/App/App/` folder |
| Pod dependency errors | Run `cd ios && pod install --repo-update` |
| Signing errors in Xcode | Go to **Signing & Capabilities** → Select correct Team ID |
| Xcode build fails | Delete `ios/Pods` folder, run `pod install` again |
| Push permissions not requested | Add **Push Notifications** in **Signing & Capabilities** |
| Info.plist missing | Run `npx cap sync ios` to regenerate |
| CocoaPods not found | Install: `sudo gem install cocoapods` |

### General Issues

| Issue | Fix |
|-------|-----|
| API calls fail in native app | Use absolute URLs (`https://keydoctors.veewiss.com/api/...`); relative URLs don't work |
| CORS errors | Backend must allow `capacitor://localhost` and `http://localhost` origins |
| "Invalid Firebase config" | Verify `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) are properly placed |
| Backend token storage fails | Run `php artisan migrate` to create `push_device_tokens` table |
| Admin push send fails | Check POSadmin logs; verify `FCM_SERVER_KEY` is valid in `.env` |

---

## Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server (localhost:8080)
npm run build            # Build for production
npm test                 # Run tests

# Capacitor
npx cap sync             # Sync web build to native projects
npx cap open android     # Open in Android Studio
npx cap open ios         # Open in Xcode
npx cap run android      # Build & run on connected Android device
npx cap run ios          # Build & run on iOS simulator

# Full rebuild cycle
npm run build && npx cap sync && npx cap open android
```
