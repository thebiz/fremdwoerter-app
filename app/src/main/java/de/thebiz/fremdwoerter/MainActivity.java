package de.thebiz.fremdwoerter;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {

    static final String ACTION_ADD = "de.thebiz.fremdwoerter.ADD";
    static final String ACTION_QUIZ = "de.thebiz.fremdwoerter.QUIZ";
    static final String ACTION_SHOW = "de.thebiz.fremdwoerter.SHOW";

    static final int REQ_IMPORT = 10;
    static final int REQ_EXPORT = 11;
    static final String REPO = "thebiz/fremdwoerter-app";

    private WebView web;
    private boolean pageReady = false;
    private String pending = null;
    private String importCb = null;
    private String exportData = null;
    private String exportCb = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0E0E10);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u.toString());
                return true;
            }
        });

        handleIntent(getIntent());
        web.loadUrl("file:///android_asset/index.html");

        Store.ensureChannel(this);
        Store.schedule(this);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    /** Übersetzt Teilen, Textauswahl, Kachel und Benachrichtigung in eine Aktion für die Oberfläche. */
    private void handleIntent(Intent i) {
        if (i == null || i.getAction() == null) return;
        try {
            JSONObject o = new JSONObject();
            String a = i.getAction();
            if (Intent.ACTION_SEND.equals(a)) {
                o.put("type", "add");
                o.put("text", nz(i.getStringExtra(Intent.EXTRA_TEXT)));
            } else if (Intent.ACTION_PROCESS_TEXT.equals(a)) {
                CharSequence t = i.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
                o.put("type", "add");
                o.put("text", t == null ? "" : t.toString());
            } else if (ACTION_ADD.equals(a)) {
                o.put("type", "add");
                o.put("text", "");
            } else if (ACTION_QUIZ.equals(a)) {
                o.put("type", "quiz");
            } else if (ACTION_SHOW.equals(a)) {
                o.put("type", "show");
                o.put("id", nz(i.getStringExtra("id")));
            } else {
                return;
            }
            pending = o.toString();
            // Aktion nur einmal auswerten, auch nach Drehen oder Neustart
            i.setAction(Intent.ACTION_MAIN);
            if (pageReady) js("window.onPending && window.onPending()");
        } catch (Exception ignored) { }
    }

    private static String nz(String s) { return s == null ? "" : s; }

    private void js(final String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private void callback(String cb, String json) {
        js("window.__cb && window.__cb(" + JSONObject.quote(cb) + "," + JSONObject.quote(json) + ")");
    }

    private void openExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) { }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.onBack ? window.onBack() : false", value -> {
            if (!"true".equals(value)) MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (pageReady) web.evaluateJavascript("window.flush && window.flush()", null);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_IMPORT) {
            String cb = importCb;
            importCb = null;
            if (cb == null) return;
            if (res != RESULT_OK || data == null || data.getData() == null) {
                callback(cb, "{\"ok\":false}");
                return;
            }
            final Uri uri = data.getData();
            new Thread(() -> {
                try {
                    InputStream in = getContentResolver().openInputStream(uri);
                    String text = Store.readStream(in);
                    JSONObject o = new JSONObject();
                    o.put("ok", true);
                    o.put("text", text);
                    o.put("name", nz(uri.getLastPathSegment()));
                    callback(cb, o.toString());
                } catch (Exception e) {
                    callback(cb, "{\"ok\":false,\"error\":\"Datei nicht lesbar\"}");
                }
            }).start();
        } else if (req == REQ_EXPORT) {
            String cb = exportCb;
            String payload = exportData;
            exportCb = null;
            exportData = null;
            if (res != RESULT_OK || data == null || data.getData() == null || payload == null) {
                if (cb != null) callback(cb, "{\"ok\":false}");
                return;
            }
            final Uri uri = data.getData();
            new Thread(() -> {
                try {
                    OutputStream out = getContentResolver().openOutputStream(uri, "wt");
                    out.write(payload.getBytes(StandardCharsets.UTF_8));
                    out.close();
                    if (cb != null) callback(cb, "{\"ok\":true}");
                } catch (Exception e) {
                    if (cb != null) callback(cb, "{\"ok\":false}");
                }
            }).start();
        }
    }

    /** Schnittstelle für die Oberfläche (window.Android). */
    class Bridge {

        @JavascriptInterface
        public String load() {
            String d = Store.load(MainActivity.this);
            return d.isEmpty() ? "" : d;
        }

        @JavascriptInterface
        public String seed() {
            return Store.seed(MainActivity.this);
        }

        @JavascriptInterface
        public void save(String json) {
            Store.save(MainActivity.this, json);
        }

        @JavascriptInterface
        public void ready() {
            pageReady = true;
        }

        @JavascriptInterface
        public String takePending() {
            String p = pending;
            pending = null;
            return p == null ? "" : p;
        }

        @JavascriptInterface
        public int version() {
            return BuildConfig.VERSION_CODE;
        }

        @JavascriptInterface
        public String getDaily() {
            SharedPreferences p = Store.prefs(MainActivity.this);
            try {
                JSONObject o = new JSONObject();
                o.put("on", p.getBoolean("daily", true));
                o.put("hour", p.getInt("hour", 9));
                o.put("minute", p.getInt("minute", 0));
                return o.toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public void setDaily(boolean on, int hour, int minute) {
            Store.prefs(MainActivity.this).edit()
                    .putBoolean("daily", on)
                    .putInt("hour", hour)
                    .putInt("minute", minute)
                    .apply();
            Store.schedule(MainActivity.this);
            if (on) askNotify();
        }

        @JavascriptInterface
        public void askNotify() {
            if (Build.VERSION.SDK_INT >= 33 &&
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 5));
            }
        }

        @JavascriptInterface
        public void testNotify() {
            askNotify();
            Store.showWordOfDay(MainActivity.this, true);
        }

        @JavascriptInterface
        public String wordOfDay() {
            JSONObject w = Store.todayWord(MainActivity.this);
            return w == null ? "" : w.optString("id", w.optString("wort"));
        }

        @JavascriptInterface
        public void openUrl(String url) {
            openExternal(url);
        }

        @JavascriptInterface
        public void hideKeyboard() {
            runOnUiThread(() -> {
                InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                imm.hideSoftInputFromWindow(web.getWindowToken(), 0);
            });
        }

        /** Holt den Wikitext eines Wiktionary-Eintrags; probiert Schreibvarianten. */
        @JavascriptInterface
        public void lookup(final String word, final String cb) {
            new Thread(() -> {
                String w = word.trim();
                String[] variants = {
                        w,
                        w.isEmpty() ? w : w.substring(0, 1).toUpperCase() + w.substring(1),
                        w.toLowerCase()
                };
                try {
                    for (String v : variants) {
                        if (v.isEmpty()) continue;
                        String text = fetchRaw(v);
                        if (text != null && text.startsWith("#")) {
                            // Weiterleitung: #WEITERLEITUNG [[Ziel]]
                            int s = text.indexOf("[[");
                            int e = text.indexOf("]]", s);
                            if (s >= 0 && e > s) {
                                v = text.substring(s + 2, e);
                                text = fetchRaw(v);
                            }
                        }
                        if (text != null && !text.isEmpty()) {
                            JSONObject o = new JSONObject();
                            o.put("ok", true);
                            o.put("title", v);
                            o.put("text", text);
                            callback(cb, o.toString());
                            return;
                        }
                    }
                    callback(cb, "{\"ok\":false,\"error\":\"notfound\"}");
                } catch (Exception e) {
                    callback(cb, "{\"ok\":false,\"error\":\"offline\"}");
                }
            }).start();
        }

        /** Holt die DWDS-Wörterbuchseite als HTML (zweite Quelle). */
        @JavascriptInterface
        public void lookupDwds(final String word, final String cb) {
            new Thread(() -> {
                try {
                    String url = "https://www.dwds.de/wb/" + URLEncoder.encode(word.trim(), "UTF-8").replace("+", "%20");
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(12000);
                    c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 15) Fremdwoerter-App");
                    c.setRequestProperty("Accept-Language", "de");
                    int code = c.getResponseCode();
                    if (code == 404) {
                        callback(cb, "{\"ok\":false,\"error\":\"notfound\"}");
                        return;
                    }
                    if (code != 200) throw new Exception("HTTP " + code);
                    JSONObject o = new JSONObject();
                    o.put("ok", true);
                    o.put("html", Store.readStream(c.getInputStream()));
                    callback(cb, o.toString());
                } catch (Exception e) {
                    callback(cb, "{\"ok\":false,\"error\":\"offline\"}");
                }
            }).start();
        }

        private String fetchRaw(String title) throws Exception {
            String url = "https://de.wiktionary.org/w/index.php?action=raw&title="
                    + URLEncoder.encode(title.replace(' ', '_'), "UTF-8");
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(10000);
            c.setRequestProperty("User-Agent", "Fremdwoerter-App/1.0 (privat)");
            int code = c.getResponseCode();
            if (code == 404) return null;
            if (code != 200) throw new Exception("HTTP " + code);
            return Store.readStream(c.getInputStream());
        }

        /** Fragt das neueste Release auf GitHub ab. */
        @JavascriptInterface
        public void checkUpdate(final String cb) {
            new Thread(() -> {
                try {
                    HttpURLConnection c = (HttpURLConnection) new URL(
                            "https://api.github.com/repos/" + REPO + "/releases/latest").openConnection();
                    c.setConnectTimeout(8000);
                    c.setReadTimeout(10000);
                    c.setRequestProperty("Accept", "application/vnd.github+json");
                    c.setRequestProperty("User-Agent", "Fremdwoerter-App");
                    if (c.getResponseCode() != 200) throw new Exception();
                    JSONObject r = new JSONObject(Store.readStream(c.getInputStream()));
                    JSONObject o = new JSONObject();
                    o.put("ok", true);
                    o.put("tag", r.optString("tag_name"));
                    o.put("url", r.optString("html_url"));
                    if (r.optJSONArray("assets") != null && r.getJSONArray("assets").length() > 0) {
                        o.put("apk", r.getJSONArray("assets").getJSONObject(0).optString("browser_download_url"));
                    }
                    callback(cb, o.toString());
                } catch (Exception e) {
                    callback(cb, "{\"ok\":false}");
                }
            }).start();
        }

        @JavascriptInterface
        public void pickFile(String cb) {
            importCb = cb;
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*");
            runOnUiThread(() -> startActivityForResult(i, REQ_IMPORT));
        }

        @JavascriptInterface
        public void saveFile(String name, String mime, String content, String cb) {
            exportData = content;
            exportCb = cb;
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                    .addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(mime)
                    .putExtra(Intent.EXTRA_TITLE, name);
            runOnUiThread(() -> startActivityForResult(i, REQ_EXPORT));
        }
    }
}
