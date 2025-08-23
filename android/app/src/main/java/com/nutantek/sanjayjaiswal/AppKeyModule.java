package com.nutantek.sanjayjaiswal;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import com.facebook.react.bridge.*;
import java.io.InputStream;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.*;

public class AppKeyModule extends ReactContextBaseJavaModule {
    public AppKeyModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "AppKeyModule";
    }

    @ReactMethod
    public void getEncryptedAppKey(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences("secure_prefs", Context.MODE_PRIVATE);
            String cached = prefs.getString("app_key_encrypted", null);
            if (cached != null) {
                promise.resolve(cached);
                return;
            }

            InputStream is = context.getAssets().open("app_key.txt");
            byte[] raw = new byte[is.available()];
            is.read(raw);
            String appKey = new String(raw);

            KeyGenerator keyGen = KeyGenerator.getInstance("AES");
            keyGen.init(256);
            SecretKey key = keyGen.generateKey();

            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] encrypted = cipher.doFinal(appKey.getBytes());

            String encryptedStr = Base64.encodeToString(encrypted, Base64.NO_WRAP);
            prefs.edit().putString("app_key_encrypted", encryptedStr).apply();
            promise.resolve(encryptedStr);
        } catch (Exception e) {
            promise.reject("ENCRYPTION_ERROR", e);
        }
    }
}


