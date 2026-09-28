package com.nimanthashyamin.moneymanager;

import android.app.Activity;
import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;

public class WebAppInterface {
    private final Activity mActivity;
    private final Vibrator mVibrator;

    public WebAppInterface(Activity activity) {
        this.mActivity = activity;
        this.mVibrator = initVibrator(activity);
    }

    private Vibrator initVibrator(Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (manager != null) {
                    return manager.getDefaultVibrator();
                }
            }
            return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        } catch (Exception e) {
            return null;
        }
    }

    @JavascriptInterface
    public void vibrate(long milliseconds) {
        if (mVibrator == null || !mVibrator.hasVibrator()) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mVibrator.vibrate(VibrationEffect.createOneShot(
                        Math.max(10, milliseconds),
                        VibrationEffect.DEFAULT_AMPLITUDE
                ));
            } else {
                mVibrator.vibrate(milliseconds);
            }
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void vibratePattern(String patternJson) {
        if (mVibrator == null || !mVibrator.hasVibrator()) return;
        try {
            JSONArray arr = new JSONArray(patternJson);
            long[] timings = new long[arr.length()];
            for (int i = 0; i < arr.length(); i++) {
                timings[i] = arr.getLong(i);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                mVibrator.vibrate(VibrationEffect.createWaveform(timings, -1));
            } else {
                mVibrator.vibrate(timings, -1);
            }
        } catch (Exception ignored) {
        }
    }

    @JavascriptInterface
    public void showToast(final String message) {
        if (mActivity == null) return;
        mActivity.runOnUiThread(() -> Toast.makeText(mActivity, message, Toast.LENGTH_SHORT).show());
    }

    @JavascriptInterface
    public void setStatusBarTheme(final boolean isDark) {
        if (mActivity == null) return;
        mActivity.runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.view.WindowInsetsController controller = mActivity.getWindow().getInsetsController();
                if (controller != null) {
                    if (isDark) {
                        // Dark background -> white icons
                        controller.setSystemBarsAppearance(0, android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
                    } else {
                        // Light background -> dark icons
                        controller.setSystemBarsAppearance(
                                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                        );
                    }
                }
            } else {
                int flags = mActivity.getWindow().getDecorView().getSystemUiVisibility();
                if (isDark) {
                    flags &= ~android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                } else {
                    flags |= android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
                mActivity.getWindow().getDecorView().setSystemUiVisibility(flags);
            }
        });
    }

    @JavascriptInterface
    public void exitApp() {
        if (mActivity == null) return;
        mActivity.runOnUiThread(mActivity::finish);
    }
}
