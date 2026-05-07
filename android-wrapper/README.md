# TO3 Manual Input - Android WebView Wrapper

## Purpose

Android WebView wrapper for the TO3 Manual Input web application, designed for iMin Swift 2 Pro POS devices with integrated printer.

## Features

- 🌐 Loads https://to3.halotec.my.id in native Android WebView
- 🖨️ JavaScript bridge for native printer integration
- 📱 Responsive design optimized for POS devices
- 🔄 Automatic bridge detection (web app uses native printing when available, falls back to browser print)

## Requirements

- JDK 17+
- Android Studio Hedgehog (2023.1.1) or newer
- Android SDK API 24+ (Android 7.0+)
- iMin Swift 2 Pro device

## Quick Start

### Build APK

```bash
# Using Android Studio
1. Open this project in Android Studio
2. Sync Gradle
3. Build > Build Bundle(s) / APK(s) > Build APK(s)
4. Locate APK at: app/build/outputs/apk/debug/app-debug.apk

# Using command line
./gradlew assembleDebug
```

### Install on Device

1. Enable Developer Options on Android device
2. Enable "Install from Unknown Sources"
3. Transfer APK to device (SD card, USB, download)
4. Install APK
5. Open app - should load https://to3.halotec.my.id

## Project Structure

```
android-wrapper/
├── app/
│   ├── src/main/
│   │   ├── java/id/my/halotec/to3manualinput/
│   │   │   ├── MainActivity.kt           # WebView setup, bridge registration
│   │   │   └── AndroidPrinterBridge.kt   # Print bridge (TODO: iMin SDK integration)
│   │   ├── res/
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── gradle/
└── build.gradle.kts
```

## Configuration

### Change Web App URL

Edit `app/build.gradle.kts`:
```kotlin
buildConfigField("String", "WEB_APP_URL", "\"https://to3.halotec.my.id\"")
```

### Change Package Name

Edit `app/src/main/AndroidManifest.xml`:
```xml
<manifest package="id.my.halotec.to3manualinput">
```

And update all package references in Java/Kotlin files.

## Printer Integration

### Current State: Placeholder (Toast)

The `AndroidPrinterBridge` currently shows a Toast message with container number. This is for testing the bridge without needing the printer SDK.

### Production: iMin SDK

See [android-webview-wrapper.md](../../docs/android-webview-wrapper.md) for complete iMin printer SDK integration instructions.

## JavaScript Bridge

### Available Bridge Methods

```javascript
// Print CMS receipt
window.AndroidPrinter.printCms(JSON.stringify({
  container: "SHCU2215522",
  cmsNo: "2605713643",
  transactionId: "1520203",
  datetime: "2026-05-06T16:29:33"
}))
```

### Bridge Detection in Web App

```typescript
import { hasAndroidPrinterBridge, tryAndroidPrintCms } from '@/lib/printing';

// Check if bridge is available
if (hasAndroidPrinterBridge()) {
  console.log("Running in Android WebView with printer support");
}

// Try to use Android printer
const printed = tryAndroidPrintCms(cmsPayload);
if (!printed) {
  // Fall back to browser print
  window.print();
}
```

## Development

### Run on Emulator

```bash
# Create emulator
avdmanager create avd -n "TO3_POS" -k "google_apis" -d "tablet"

# Run emulator
emulator -avd TO3_POS &

# Install app
./gradlew installDebug

### View Logs

```bash
# Logcat (all logs)
adb logcat

# Filter by tag
adb logcat AndroidPrinterBridge:D *:S

# Filter by package
adb logcat | grep "id.my.halotec.to3manualinput"
```

### Debug WebView

Enable remote debugging in `MainActivity.kt`:
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
    WebView.setWebContentsDebuggingEnabled(true)
}
```

Then open `chrome://inspect` in Chrome on your development machine.

## Troubleshooting

### Issue: App crashes on startup

**Check:**
- JDK version (17+ required)
- Android SDK installed
- Gradle synced successfully

### Issue: Bridge not working

**Check:**
- JavaScript enabled: `webView.settings.javaScriptEnabled = true`
- Interface added: `webView.addJavascriptInterface(AndroidPrinterBridge(this), "AndroidPrinter")`
- Logcat for JavaScript errors

### Issue: Printer not printing

**Check:**
- iMin printer SDK dependency added
- Printer initialized in MainActivity
- Device Bluetooth enabled
- Printer paired in Android settings
- Logcat for printer errors

## Building for Production

### Release APK

```bash
# Configure signing (one-time)
./gradlew assembleRelease

# Locate signed APK
app/build/outputs/apk/release/app-release.apk
```

### Generate Signed Bundle

```bash
# Build Android App Bundle
./gradlew bundleRelease

# Locate bundle
app/build/outputs/bundle/release/app-release.aab
```

## Version History

- **v1.0** - Initial scaffold with WebView and printer bridge placeholder
- **v1.1** - Enhanced with permission handling, printer initialization stub, and improved documentation

## License

Same license as main TO3 Manual Input project.

## Support

For issues or questions:
1. Check [android-webview-wrapper.md](../../docs/android-webview-wrapper.md) for detailed documentation
2. Review MainActivity.kt and AndroidPrinterBridge.kt comments
3. Check device manufacturer documentation for iMin printer SDK specifics
