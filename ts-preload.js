(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Torrent Preload SAFE] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';
    var STORAGE_KEY = 'mx_torrent_preload_enabled';

    // ===== STATE =====
    function isEnabled() {
        var v = Lampa.Storage.get(STORAGE_KEY);
        return v === null ? true : v;
    }

    function toggleEnabled() {
        var v = !isEnabled();
        Lampa.Storage.set(STORAGE_KEY, v);
        Lampa.Noty.show('MX Torrent Preload: ' + (v ? 'ON' : 'OFF'));
    }

    // ===== MANUAL MENU (ALWAYS WORKS) =====
    Lampa.Listener.follow('app', function (e) {
        if (e.type !== 'ready') return;

        Lampa.Controller.add({
            title: 'MX Torrent Preload',
            subtitle: function () {
                return isEnabled() ? 'Đang bật' : 'Đang tắt';
            },
            onSelect: function () {
                toggleEnabled();
            }
        });
    });

    // ===== PRELOAD TIME (REMOTE) =====
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
        var preload = enabled ? getPreloadTime(size) : 0;

        console.log('[MX Torrent Preload]', enabled, preload);

        Lampa.Player.stop();

        setTimeout(function () {
            openMX(e.url, e.title);
        }, preload * 1000);
    });

    // ===== OPEN MX PLAYER =====
    function openMX(url, title) {
        var intent = {
            action: 'android.intent.action.VIEW',
            type: 'video/*',
            package: MX_PACKAGE,
            data: url,
            extras: {
                title: title || 'Lampa Torrent'
            }
        };

        if (window.Android && Android.startActivity) {
            Android.startActivity(JSON.stringify(intent));
        } else {
            console.log('[MX Torrent Preload] Android intent missing');
        }
    }

})();