package com.nimanthashyamin.moneymanager;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import android.webkit.ConsoleMessage;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {

    private WebView mWebView;
    private long mLastBackPressTime = 0;
    private int mStatusBarDp = 54;
    private int mNavBarDp = 24;

    private void injectSafeInsets() {
        if (mWebView != null) {
            mWebView.post(() -> mWebView.evaluateJavascript(
                    "document.documentElement.style.setProperty('--safe-top', '" + mStatusBarDp + "px');" +
                    "document.documentElement.style.setProperty('--safe-bottom', '" + mNavBarDp + "px');",
                    null
            ));
        }
    }

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure Edge-to-edge transparent system bars with initial theme awareness
        int nightModeFlags = getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        boolean isNight = (nightModeFlags == android.content.res.Configuration.UI_MODE_NIGHT_YES);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                if (isNight) {
                    controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
                } else {
                    controller.setSystemBarsAppearance(
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                    );
                }
            }
        } else {
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            if (!isNight) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        setContentView(R.layout.activity_main);

        mWebView = findViewById(R.id.webview);
        WebView.setWebContentsDebuggingEnabled(true);

        // Dynamically compute exact notch / cutout, status bar, and navigation bar heights in dp
        findViewById(R.id.root_container).setOnApplyWindowInsetsListener((v, insets) -> {
            int topInset = 0;
            int bottomInset = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets barInsets = insets.getInsets(
                        android.view.WindowInsets.Type.statusBars() | android.view.WindowInsets.Type.displayCutout()
                );
                topInset = barInsets.top;

                android.graphics.Insets navInsets = insets.getInsets(
                        android.view.WindowInsets.Type.navigationBars() | android.view.WindowInsets.Type.systemGestures()
                );
                bottomInset = navInsets.bottom;
            } else {
                topInset = insets.getSystemWindowInsetTop();
                bottomInset = insets.getSystemWindowInsetBottom();
            }

            float density = getResources().getDisplayMetrics().density;
            if (density > 0) {
                if (topInset > 0) {
                    mStatusBarDp = Math.max(Math.round(topInset / density), 48);
                }
                if (bottomInset > 0) {
                    mNavBarDp = Math.max(Math.round(bottomInset / density), 20);
                }
                injectSafeInsets();
            }
            return insets;
        });

        // Configure WebView settings for full modern web app support
        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Enable hardware acceleration
        mWebView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        mWebView.setBackgroundColor(Color.parseColor("#090D16"));

        // Register Native JavaScript Bridge
        mWebView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");

        // Custom WebViewClient for internal navigation & external links
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                return handleUrlNavigation(url);
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrlNavigation(url);
            }

            private boolean handleUrlNavigation(String url) {
                if (url.startsWith("file:///android_asset/")) {
                    return false; // Load inside app
                }
                // External links opened in browser or phone handler
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectSafeInsets();
            }
        });

        // Custom WebChromeClient for dialogs and console logs
        mWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Money Manager")
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                        .setCancelable(false)
                        .create()
                        .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Money Manager")
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (dialog, which) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (dialog, which) -> result.cancel())
                        .setCancelable(false)
                        .create()
                        .show();
                return true;
            }

            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.d("WebConsole", "[" + consoleMessage.messageLevel() + "] "
                        + consoleMessage.message() + " ("
                        + consoleMessage.sourceId() + ":" + consoleMessage.lineNumber() + ")");
                return super.onConsoleMessage(consoleMessage);
            }
        });

        // Load the entrypoint
        if (savedInstanceState == null) {
            mWebView.loadUrl("file:///android_asset/www/index.html");
        } else {
            mWebView.restoreState(savedInstanceState);
        }
    }

    @Override
    public void onBackPressed() {
        if (mWebView != null) {
            mWebView.evaluateJavascript("window.handleAndroidBack ? window.handleAndroidBack() : false;", new ValueCallback<String>() {
                @Override
                public void onReceiveValue(String value) {
                    if ("true".equalsIgnoreCase(value)) {
                        // Handled by web app (closed modal/dropdown/returned to home tab)
                        return;
                    }

                    if (mWebView.canGoBack()) {
                        mWebView.goBack();
                        return;
                    }

                    // Root exit with double tap protection
                    long now = System.currentTimeMillis();
                    if (now - mLastBackPressTime < 2000) {
                        finish();
                    } else {
                        mLastBackPressTime = now;
                        Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                    }
                }
            });
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (mWebView != null) {
            mWebView.saveState(outState);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mWebView != null) {
            mWebView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mWebView != null) {
            mWebView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (mWebView != null) {
            mWebView.destroy();
            mWebView = null;
        }
        super.onDestroy();
    }
}
