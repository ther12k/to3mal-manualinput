# Android WebView Wrapper - Production Setup Guide

## Overview

This wrapper loads the TO3 Manual Input web app in an Android WebView and provides a JavaScript bridge for native printer integration on iMin Swift 2 Pro devices.

## Current State

- ✅ WebView wrapper scaffolded
- ✅ JavaScript bridge (`window.AndroidPrinter.printCms()`) implemented
- ✅ Web app detects bridge and uses it when available
- ⏳ iMin printer SDK integration (placeholder ready)

## Quick Start

### 1. Build the APK

**Requirements:**
- JDK 17+
- Android Studio Hedgehog (2023.1.1) or newer
- Android SDK API 24+ (Android 7.0)

**Steps:**
```bash
# Open in Android Studio
cd android-wrapper/

# Or build via command line
./gradlew assembleDebug
```

### 2. Install on iMin Swift 2 Pro

1. Enable developer options on device
2. Allow installation from unknown sources
3. Transfer APK: `android-wrapper/app/build/outputs/apk/debug/app-debug.apk`
4. Install APK

### 3. Test the Bridge

Open app → It loads https://to3.halotec.my.id → Try printing → Should show "Print: CONTAINER" toast

---

## iMin Printer SDK Integration

### Step 1: Add SDK Dependency

**Option A: Aispace SDK (Common)**
```kotlin
// build.gradle (app level)
dependencies {
    implementation 'com.aispace.android:printer:1.0.0' // Check latest version
}
```

**Option B: Manufacturer SDK**
Check iMin device documentation for the specific SDK package.

### Step 2: Initialize Printer in MainActivity

Add to `MainActivity.kt`:
```kotlin
private fun initializePrinter() {
    try {
        // Aispace example
        val printer = PrinterManager.getInstance().getPrinter()
        printer.connect(context)

        Toast.makeText(this, "Printer connected", Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        Log.e("MainActivity", "Failed to initialize printer", e)
        Toast.makeText(this, "Printer init failed", Toast.LENGTH_SHORT).show()
    }
}
```

Call in `onPageFinished`:
```kotlin
override fun onPageFinished(view: WebView?, url: String?) {
    super.onPageFinished(view, url)
    initializePrinter()
}
```

### Step 3: Replace Print Methods in AndroidPrinterBridge

**Find the TODO sections and replace with actual SDK calls:**

```kotlin
@JavascriptInterface
fun printCms(payload: String) {
    runCatching {
        val json = JSONObject(payload)

        // Extract data
        val container = json.optString("container", "")
        val cmsNo = json.optString("cmsNo", "")

        // Get printer instance
        val printer = PrinterManager.getInstance().getPrinter()

        // Check connection
        if (!printer.isConnected) {
            printer.connect(context)
        }

        // Format receipt
        val receipt = formatReceipt(json)

        // Print text
        printer.printText(receipt, PrinterDevice.ALIGN_LEFT)

        // Cut paper
        printer.cutPaper()

        Toast.makeText(context, "Printed: $container", Toast.LENGTH_SHORT).show()

    } catch (e: Exception) {
        Log.e(TAG, "Print failed", e)
        Toast.makeText(context, "Print failed", Toast.LENGTH_SHORT).show()
    }
}
```

---

## Bridge Contract

**Web App Sends:**
```json
{
  "container": "SHCU2215522",
  "cmsNo": "2605713643",
  "transactionId": "1520203",
  "datetime": "2026-05-06T16:29:33"
}
```

**JavaScript Call:**
```javascript
window.AndroidPrinter.printCms(JSON.stringify(cmsPayload))
```

**Native Implementation:**
- Method: `AndroidPrinterBridge.printCms(payload: String)`
- Thread: Main thread (UI)
- Returns: void (uses Toast for feedback)

---

## Common iMin Printer Commands

### Text Printing
```kotlin
printer.printText("Sample text", PrinterDevice.ALIGN_LEFT)
printer.printText("Centered", PrinterDevice.ALIGN_CENTER)
printer.printText("Right", PrinterDevice.ALIGN_RIGHT)
```

### Barcode/QR Code
```kotlin
printer.printBarcode("123456", BarcodeType.CODE128, 100, 2)
printer.printQRCode("https://example.com", 200, 2)
```

### Paper Control
```kotlin
printer.feedPaper(3)  // Feed 3 lines
printer.cutPaper()    // Cut paper
```

---

## Troubleshooting

### Issue: Bridge not working
**Check:**
- JavaScript enabled: `webView.settings.javaScriptEnabled = true`
- Interface added: `webView.addJavascriptInterface(AndroidPrinterBridge(this), "AndroidPrinter")`
- Web app checks: `typeof window.AndroidPrinter?.printCms`

### Issue: Printer not connecting
**Check:**
- Bluetooth enabled on device
- Printer paired in Android settings
- Permissions granted (BLUETOOTH, BLUETOOTH_ADMIN)
- Manufacturer SDK documentation

### Issue: Print quality poor
**Adjust:**
- Font size in `formatReceipt()`
- Text encoding
- Printer settings (density, speed)

---

## File Structure

```
android-wrapper/
├── app/
│   ├── src/main/
│   │   ├── java/id/my/halotec/to3manualinput/
│   │   │   ├── MainActivity.kt              # WebView setup
│   │   │   └── AndroidPrinterBridge.kt     # Print bridge
│   │   ├── res/
│   │   │   └── values/
│   │   │       └── strings.xml
│   │   └── AndroidManifest.xml
│   └── build.gradle
└── build.gradle
```

---

## Next Steps

1. **Add iMin SDK dependency** to build.gradle
2. **Implement printer initialization** in MainActivity
3. **Replace TODO sections** in AndroidPrinterBridge
4. **Test printing** on actual iMin device
5. **Adjust receipt formatting** as needed

---

## Resources

- iMin Developer Portal: https://developer.imin.com/
- Android WebView Docs: https://developer.android.com/guide/webapps/webview
- JavaScript Bridge Docs: https://developer.android.com/guide/webapps/webview#BindingJavaScript
