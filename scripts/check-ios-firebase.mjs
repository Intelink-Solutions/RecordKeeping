#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const iosDir = path.join(projectRoot, 'ios');

let hasErrors = false;

console.log('🔍 Checking iOS Firebase Push Notification readiness...\n');

// Check 1: ios/ directory exists
if (!fs.existsSync(iosDir)) {
  console.log('❌ ERROR: ios/ directory not found');
  console.log('   FIX: Run `npx cap sync ios` to create the iOS project\n');
  hasErrors = true;
} else {
  console.log('✅ iOS project directory found');
}

// Check 2: Podfile exists
const podfilePath = path.join(iosDir, 'Podfile');
if (!fs.existsSync(podfilePath)) {
  console.log('❌ ERROR: Podfile not found in ios/');
  console.log('   FIX: Run `npx cap update` to regenerate Podfile\n');
  hasErrors = true;
} else {
  console.log('✅ Podfile found');
}

// Check 3: Xcode project exists (App.xcodeproj)
const xcodeProjectPattern = path.join(iosDir, 'App', '*.xcodeproj');
const xcodeProjDir = fs.existsSync(path.join(iosDir, 'App')) 
  ? fs.readdirSync(path.join(iosDir, 'App')).find(f => f.endsWith('.xcodeproj'))
  : null;

if (!xcodeProjDir) {
  console.log('⚠️  WARNING: Xcode project not found (will be generated during first build)');
} else {
  console.log('✅ Xcode project found: ' + xcodeProjDir);
}

// Check 4: Info.plist exists (contains app metadata)
const infoPlistPath = path.join(iosDir, 'App', 'App', 'Info.plist');
if (!fs.existsSync(infoPlistPath)) {
  console.log('⚠️  WARNING: Info.plist not found (will be auto-generated)');
  console.log('   INFO: Run `npx cap sync ios` to generate\n');
} else {
  console.log('✅ Info.plist found');

  // Check 5: Verify push capability in Info.plist
  try {
    const infoPlistContent = fs.readFileSync(infoPlistPath, 'utf-8');
    const hasRemoteNotif = infoPlistContent.includes('UIRemoteNotificationTypeAlert') ||
                          infoPlistContent.includes('remote-notification');
    if (!hasRemoteNotif) {
      console.log('⚠️  WARNING: Remote notification capability not found in Info.plist');
      console.log('   INFO: This will be added when you configure push in Apple Developer\n');
    } else {
      console.log('✅ Remote notification capability found');
    }
  } catch (e) {
    console.log('⚠️  WARNING: Could not read Info.plist: ' + e.message);
  }
}

// Check 6: GoogleService-Info.plist exists
const googleServicePath = path.join(iosDir, 'App', 'GoogleService-Info.plist');
if (!fs.existsSync(googleServicePath)) {
  console.log('❌ ERROR: GoogleService-Info.plist not found');
  console.log('   FIX: Download from Firebase Console (iOS config file)');
  console.log('        Place at: ios/App/GoogleService-Info.plist\n');
  hasErrors = true;
} else {
  console.log('✅ GoogleService-Info.plist found');
}

// Check 7: Capacitor config exists
const capacitorConfigPath = path.join(projectRoot, 'capacitor.config.ts');
if (!fs.existsSync(capacitorConfigPath)) {
  console.log('⚠️  WARNING: capacitor.config.ts not found at project root');
} else {
  console.log('✅ Capacitor config found');

  // Check for push notification config
  try {
    const capacitorConfig = fs.readFileSync(capacitorConfigPath, 'utf-8');
    const hasFirebasePlugin = capacitorConfig.includes('@capacitor/push-notifications') ||
                             capacitorConfig.includes('PushNotifications');
    if (!hasFirebasePlugin) {
      console.log('⚠️  WARNING: Push notification plugin not configured in capacitor.config.ts');
      console.log('   INFO: Ensure @capacitor/push-notifications is in package.json dependencies\n');
    } else {
      console.log('✅ Push notification plugin configured');
    }
  } catch (e) {
    console.log('⚠️  WARNING: Could not read capacitor config: ' + e.message);
  }
}

// Check 8: Package.json has @capacitor/push-notifications
const packageJsonPath = path.join(projectRoot, 'package.json');
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  if (!deps['@capacitor/push-notifications']) {
    console.log('❌ ERROR: @capacitor/push-notifications not found in package.json');
    console.log('   FIX: Run `npm install @capacitor/push-notifications`\n');
    hasErrors = true;
  } else {
    console.log('✅ @capacitor/push-notifications installed');
  }
} catch (e) {
  console.log('⚠️  WARNING: Could not read package.json: ' + e.message);
}

// Required Platform Prerequisites
console.log('\n🔧 REQUIRED PLATFORM PREREQUISITES:');
console.log('   • macOS (for iOS development)');
console.log('   • Xcode 13+ installed');
console.log('   • CocoaPods installed: `sudo gem install cocoapods`');
console.log('   • Apple Developer account with push certificate\n');

// Next Steps
console.log('📋 NEXT STEPS:');
console.log('   1. Download GoogleService-Info.plist from Firebase Console');
console.log('      → Go to Project Settings > iOS app');
console.log('      → Download the config file and place in ios/App/GoogleService-Info.plist');
console.log('   2. On macOS, open ios/App/App.xcodeproj in Xcode');
console.log('   3. Configure signing & capabilities:');
console.log('      → Team ID for signing');
console.log('      → Enable "Push Notifications" capability');
console.log('   4. Build and run on iOS device/simulator: `npx cap run ios`\n');

if (hasErrors) {
  console.log('❌ iOS Firebase setup INCOMPLETE - fix errors above before building\n');
  process.exit(1);
} else {
  console.log('✅ iOS Firebase setup ready! (Run on macOS + Xcode to build)\n');
  process.exit(0);
}
