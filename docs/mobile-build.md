# Mobile Build Guide (Capacitor)

This guide covers building MGCARE for Android and iOS using Capacitor.

## Prerequisites

### For Android
- Android Studio (latest)
- Android SDK
- Java 17+

### For iOS
- macOS
- Xcode (latest)
- CocoaPods
- Apple Developer account (for device testing)

## Initial Setup

### 1. Build Web Assets

```bash
cd frontend
npm run build
```

### 2. Initialize Capacitor

Capacitor is already configured in `capacitor.config.ts`. If starting fresh:

```bash
npx cap init MGCARE com.aucare.app --web-dir=dist
```

### 3. Add Platforms

```bash
# Add Android
npx cap add android

# Add iOS (macOS only)
npx cap add ios
```

## Android Development

### Build and Run

```bash
# Build web assets and sync
npm run build
npx cap sync android

# Open in Android Studio
npx cap open android

# Or run directly (with connected device/emulator)
npx cap run android
```

### Android Studio Setup

1. Open project in Android Studio
2. Wait for Gradle sync to complete
3. Select device/emulator from toolbar
4. Click Run (green play button)

### Signing for Release

1. Generate keystore:
   ```bash
   keytool -genkey -v -keystore aucare-release.keystore \
       -alias aucare -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Configure `android/app/build.gradle`:
   ```groovy
   android {
       signingConfigs {
           release {
               storeFile file('aucare-release.keystore')
               storePassword System.getenv('KEYSTORE_PASSWORD')
               keyAlias 'aucare'
               keyPassword System.getenv('KEY_PASSWORD')
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

3. Build release APK:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

## iOS Development

### Build and Run

```bash
# Build web assets and sync
npm run build
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### Xcode Setup

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select your development team in Signing & Capabilities
3. Select device/simulator
4. Click Run (play button)

### CocoaPods

If you encounter pod issues:

```bash
cd ios/App
pod install --repo-update
```

### App Store Submission

1. Archive the app: Product → Archive
2. Distribute to App Store Connect
3. Complete App Store listing
4. Submit for review

## Development Workflow

### Live Reload

Enable live reload during development:

```bash
# Start dev server
npm run dev

# In capacitor.config.ts, update server:
server: {
  url: 'http://YOUR_IP:3000',
  cleartext: true
}

# Sync and run
npx cap sync
npx cap run android
```

### Sync Web Assets

After making frontend changes:

```bash
# Build and sync
npm run build
npx cap sync

# Or use the combined command
npm run mobile:build
```

## Capacitor Configuration

### capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aucare.app',
  appName: 'MGCARE',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3B82F6',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#3B82F6',
    },
  },
};

export default config;
```

## Native Features

### Adding Capacitor Plugins

1. Install plugin:
   ```bash
   npm install @capacitor/camera
   ```

2. Sync native projects:
   ```bash
   npx cap sync
   ```

3. Use in code:
   ```typescript
   import { Camera, CameraResultType } from '@capacitor/camera';

   const takePicture = async () => {
     const image = await Camera.getPhoto({
       quality: 90,
       resultType: CameraResultType.Base64,
     });
   };
   ```

### Common Plugins

| Plugin | Install |
|--------|---------|
| Camera | `@capacitor/camera` |
| Filesystem | `@capacitor/filesystem` |
| Geolocation | `@capacitor/geolocation` |
| Push Notifications | `@capacitor/push-notifications` |
| Share | `@capacitor/share` |
| Splash Screen | `@capacitor/splash-screen` |
| Status Bar | `@capacitor/status-bar` |

## App Icons and Splash Screens

### Generate Assets

Use [capacitor-assets](https://github.com/ionic-team/capacitor-assets):

```bash
npm install -g @capacitor/assets

# Create source images
# - resources/icon.png (1024x1024)
# - resources/splash.png (2732x2732)

# Generate all assets
npx capacitor-assets generate
```

### Manual Configuration

#### Android
- Place icons in `android/app/src/main/res/mipmap-*`
- Configure splash in `android/app/src/main/res/values/styles.xml`

#### iOS
- Configure in Xcode Assets catalog
- Edit `ios/App/App/Assets.xcassets`

## Debugging

### Android
- Use Chrome DevTools: `chrome://inspect`
- Android Studio Logcat for native logs

### iOS
- Use Safari Developer Tools
- Xcode console for native logs

### Common Issues

**Build Failed - Gradle**
```bash
cd android
./gradlew clean
./gradlew build
```

**CocoaPods Issues**
```bash
cd ios/App
pod deintegrate
pod install --repo-update
```

**Capacitor Sync Issues**
```bash
npx cap sync --deployment
```

## CI/CD for Mobile

### GitHub Actions

```yaml
# .github/workflows/mobile.yml
name: Mobile Build

on:
  push:
    tags:
      - 'v*'

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Install dependencies
        run: cd frontend && npm ci

      - name: Build web
        run: cd frontend && npm run build

      - name: Sync Capacitor
        run: cd frontend && npx cap sync android

      - name: Build APK
        run: cd frontend/android && ./gradlew assembleRelease
```

## Publishing

### Google Play Store
1. Create developer account ($25 one-time)
2. Create app listing
3. Upload signed APK/AAB
4. Submit for review

### Apple App Store
1. Enroll in Apple Developer Program ($99/year)
2. Create App Store listing
3. Upload via Xcode or Transporter
4. Submit for review

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [iOS Developer Guide](https://developer.apple.com/documentation/)
