package de.thebiz.fremdwoerter;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.app.Notification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Random;

/** Datenablage, Einstellungen und „Wort des Tages“. */
public class Store {

    static final String CHANNEL = "wort_des_tages";
    static final String PREFS = "einstellungen";

    static File dataFile(Context c) {
        return new File(c.getFilesDir(), "woerter.json");
    }

    static String readStream(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toString("UTF-8");
    }

    /** Liefert die gespeicherten Daten; beim ersten Start die mitgelieferte Wortliste. */
    static synchronized String load(Context c) {
        try {
            File f = dataFile(c);
            if (f.exists()) return readStream(new FileInputStream(f));
        } catch (Exception ignored) { }
        return "";
    }

    static String seed(Context c) {
        try {
            return readStream(c.getAssets().open("woerter.json"));
        } catch (Exception e) {
            return "[]";
        }
    }

    static synchronized void save(Context c, String json) {
        try {
            File tmp = new File(c.getFilesDir(), "woerter.tmp");
            FileOutputStream out = new FileOutputStream(tmp);
            out.write(json.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
            out.close();
            File f = dataFile(c);
            if (!tmp.renameTo(f)) {
                f.delete();
                tmp.renameTo(f);
            }
        } catch (Exception ignored) { }
    }

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Plant die tägliche Benachrichtigung (oder entfernt sie). */
    static void schedule(Context c) {
        SharedPreferences p = prefs(c);
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, DailyReceiver.class).setAction(DailyReceiver.ACTION_DAILY);
        PendingIntent pi = PendingIntent.getBroadcast(c, 1, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        if (!p.getBoolean("daily", true)) return;

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, p.getInt("hour", 9));
        cal.set(Calendar.MINUTE, p.getInt("minute", 0));
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis() + 5000) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }
        // Ohne Exakt-Berechtigung: kleines Zeitfenster von 10 Minuten
        am.setWindow(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), 10 * 60 * 1000L, pi);
    }

    /** Wählt ein Wort – bevorzugt solche, die noch nicht sitzen. */
    static JSONObject pickWord(Context c) {
        try {
            String raw = load(c);
            if (raw.isEmpty()) raw = seed(c);
            JSONArray all;
            String trimmed = raw.trim();
            if (trimmed.startsWith("{")) {
                all = new JSONObject(trimmed).optJSONArray("woerter");
            } else {
                all = new JSONArray(trimmed);
            }
            if (all == null || all.length() == 0) return null;
            List<JSONObject> weak = new ArrayList<>();
            List<JSONObject> any = new ArrayList<>();
            for (int k = 0; k < all.length(); k++) {
                JSONObject w = all.getJSONObject(k);
                if (w.optString("bedeutung", "").trim().isEmpty()) continue;
                any.add(w);
                if (w.optInt("box", 0) < 3) weak.add(w);
            }
            List<JSONObject> pool = weak.isEmpty() ? any : weak;
            if (pool.isEmpty()) return null;
            return pool.get(new Random().nextInt(pool.size()));
        } catch (Exception e) {
            return null;
        }
    }

    /** Ein Wort pro Kalendertag – App und Benachrichtigung zeigen dasselbe. */
    static synchronized JSONObject todayWord(Context c) {
        SharedPreferences p = prefs(c);
        Calendar cal = Calendar.getInstance();
        String today = cal.get(Calendar.YEAR) + "-" + cal.get(Calendar.DAY_OF_YEAR);
        String id = p.getString("wotdId", "");
        if (today.equals(p.getString("wotdDate", "")) && !id.isEmpty()) {
            JSONObject w = findWord(c, id);
            if (w != null) return w;
        }
        JSONObject w = pickWord(c);
        if (w != null) {
            p.edit().putString("wotdDate", today)
                    .putString("wotdId", w.optString("id", w.optString("wort"))).apply();
        }
        return w;
    }

    static JSONObject findWord(Context c, String id) {
        try {
            String raw = load(c).trim();
            if (raw.isEmpty()) return null;
            JSONArray all = raw.startsWith("{") ? new JSONObject(raw).optJSONArray("woerter") : new JSONArray(raw);
            if (all == null) return null;
            for (int k = 0; k < all.length(); k++) {
                JSONObject w = all.getJSONObject(k);
                if (id.equals(w.optString("id")) || id.equals(w.optString("wort"))) {
                    if (w.optString("bedeutung", "").trim().isEmpty()) return null;
                    return w;
                }
            }
        } catch (Exception ignored) { }
        return null;
    }

    static void ensureChannel(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Wort des Tages",
                    NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Ein Fremdwort pro Tag");
            nm.createNotificationChannel(ch);
        }
    }

    static void showWordOfDay(Context c, boolean test) {
        JSONObject w = test ? pickWord(c) : todayWord(c);
        if (w == null) return;
        ensureChannel(c);
        String wort = w.optString("wort");
        String bed = w.optString("bedeutung");

        Intent open = new Intent(c, MainActivity.class)
                .setAction(MainActivity.ACTION_SHOW)
                .putExtra("id", w.optString("id", wort))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 2, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new Notification.Builder(c, CHANNEL)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(wort)
                .setContentText(bed)
                .setStyle(new Notification.BigTextStyle().bigText(bed))
                .setSubText("Wort des Tages")
                .setColor(0xFFE8B86A)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        try {
            c.getSystemService(NotificationManager.class).notify(7, n);
        } catch (SecurityException ignored) { }
    }
}
