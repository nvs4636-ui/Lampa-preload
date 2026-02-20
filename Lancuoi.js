(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Torrent Preload FIX] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    var STORAGE_KEY = 'mx_torrent_preload_enabled';

    // ===== LOAD / SAVE =====
    function isEnabled() {
        var v = Lampa.Storage.get(STORAGE_KEY);
        return v === null ? true : v;
    }

    function setEnabled(v) {
        Lampa.Storage.set(STORAGE_KEY, v);
    }

    // ===== SETTINGS MENU (CORRECT API) =====
    Lampa.SettingsApi.addParam({
        component: 'player',
        param: {
            name: 'MX Torrent Preload',
            type: 'toggle',
            default: true
        },
        onChange: function (value) {
            setEnabled(value);
        },
        onRender: function (item) {
            item.value = isEnabled();
        }
    });

    // ===== PRELOAD TIME =====
    function getPreloadTime(size) {
        if (!size) return 8;

        var gb = size / (1024 * 1024 * 1024);

        if (gb <= 1) return 5;
        if (gb <= 3) return 10;
        if (gb <= 6) return 20;
        return 30;
    }

    // ===== PLAYER HOOK =====
    Lampa.Listener.follow('player', function (e) {

        if (e.type !== 'start') return;
        if (!e.url) return;

        if (!/torrserver|\/stream\//i.test(e.url)) return;

        var enabled = isEnabled();
        var size = e.size || (e.torrent && e.torrent.size);
        var preloadTime = enabled ? getPreloadTime(size) : 0;

        console.log('[MX Torrent Preload]', {
            enabled: enabled,
            preload: preloadTime
        });

        Lampa.Player.stop();

        setTimeout(function () {
            openMX(e.url, e.title);
        }, preloadTime * 1000);
    });

    // ===== OPEN MX =====
    function openMX(url, title) {
        var intent = {
            action: 'android.intent.action.VIEW',
            type: 'video/*',
            package: MX_PACKAGE,
            data: url,
            extras: {
                'title': title || 'Lampa Torrent',
                'return_result': false
            }
        };

        if (window.Android && Android.startActivity) {
            Android.startActivity(JSON.stringify(intent));
        } else {
            console.log('[MX Torrent Preload] Android intent missing');
        }
    }

})();