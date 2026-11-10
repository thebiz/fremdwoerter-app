package de.thebiz.fremdwoerter;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Zeigt das Wort des Tages und plant den nächsten Termin; plant nach Neustart neu. */
public class DailyReceiver extends BroadcastReceiver {

    static final String ACTION_DAILY = "de.thebiz.fremdwoerter.DAILY";

    @Override
    public void onReceive(Context c, Intent intent) {
        if (ACTION_DAILY.equals(intent.getAction())) {
            Store.showWordOfDay(c, false);
        }
        Store.schedule(c);
    }
}
