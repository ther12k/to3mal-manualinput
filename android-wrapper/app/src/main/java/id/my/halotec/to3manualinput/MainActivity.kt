package id.my.halotec.to3manualinput

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

/**
 * Main Activity for TO3 Manual Input WebView Wrapper
 *
 * This activity loads the TO3 web app and provides JavaScript bridges
 * for native functionality like printing.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    companion object {
        private const val PERMISSION_REQUEST_CODE = 100
        private val REQUIRED_PERMISSIONS = arrayOf(
            Manifest.permission.INTERNET,
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
            // TODO: Add iMin printer permissions if needed
            // Manifest.permission.BLUETOOTH,
            // Manifest.permission.BLUETOOTH_ADMIN,
            // Manifest.permission.BLUETOOTH_SCAN,
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check runtime permissions
        if (!hasAllPermissions()) {
            requestPermissions()
        }

        setupWebView()
    }

    /**
     * Setup WebView with configuration for the web app
     */
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            // Enable JavaScript
            javaScriptEnabled = true

            // Enable DOM storage (for React state)
            domStorageEnabled = true

            // Enable database (for IndexedDB/WebSQL)
            databaseEnabled = true

            // Cache settings
            cacheMode = WebSettings.LOAD_DEFAULT

            // Media playback
            mediaPlaybackRequiresUserGesture = false

            // Viewport settings for responsive design
            useWideViewPort = true
            loadWithOverviewMode = true

            // Mixed content (HTTP + HTTPS) for API compatibility
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            }

            // Zoom settings
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }

        // WebViewClient - handle page loading
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // TODO: Initialize printer connection here if needed
                // initializePrinter()
            }

            override fun onReceivedError(
                view: WebView?,
                request: android.webkit.WebResourceRequest?,
                error: android.webkit.WebResourceResponse?
            ) {
                super.onReceivedError(view, request, error)
                // Log web errors for debugging
                android.util.Log.e("MainActivity", "WebView error: ${error?.reason}")
            }
        }

        // WebChromeClient - handle popups, alerts, etc.
        webView.webChromeClient = WebChromeClient()

        // Add JavaScript bridge for printing
        webView.addJavascriptInterface(
            AndroidPrinterBridge(this),
            "AndroidPrinter"
        )

        // Add additional bridges if needed
        // webView.addJavascriptInterface(NFCBridge(this), "NFCReader")
        // webView.addJavascriptInterface(DeviceInfoBridge(this), "DeviceInfo")

        // Load the web app
        val webAppUrl = BuildConfig.WEB_APP_URL
        android.util.Log.i("MainActivity", "Loading web app: $webAppUrl")
        webView.loadUrl(webAppUrl)
    }

    /**
     * Handle back button press - allow WebView to navigate back
     */
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    /**
     * TODO: Initialize iMin printer connection
     * Call this in onPageFinished if printer needs to be initialized
     */
    private fun initializePrinter() {
        // TODO: Initialize iMin printer SDK
        // Example:
        // try {
        //     PrinterManager.initialize(context)
        //     val printer = PrinterManager.getInstance().getPrinter()
        //     printer.connect()
        //
        //     Toast.makeText(this, "Printer connected", Toast.LENGTH_SHORT).show()
        // } catch (e: Exception) {
        //     Log.e("MainActivity", "Failed to initialize printer", e)
        // }
    }

    /**
     * Permission handling
     */
    private fun hasAllPermissions(): Boolean {
        return REQUIRED_PERMISSIONS.all { permission ->
            checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun requestPermissions() {
        requestPermissions(REQUIRED_PERMISSIONS, PERMISSION_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)

        if (requestCode == PERMISSION_REQUEST_CODE) {
            val allGranted = grantResults.all { it == PackageManager.PERMISSION_GRANTED }

            if (!allGranted) {
                Toast.makeText(
                    this,
                    "Some permissions were denied. App may not function properly.",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    /**
     * Cleanup when activity is destroyed
     */
    override fun onDestroy() {
        super.onDestroy()

        // TODO: Disconnect printer if connected
        // try {
        //     PrinterManager.getInstance().getPrinter()?.disconnect()
        // } catch (e: Exception) {
        //     Log.e("MainActivity", "Failed to disconnect printer", e)
        // }
    }
}
