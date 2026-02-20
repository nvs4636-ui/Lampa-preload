(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Torrent Preload Remote] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== SETTINGS =====
    var settings = {
        enabled: true
    };

    function loadSettings() {
        var saved = Lampa.Storage.get('mx_torrent_preload');
        if (saved) settings = saved;
    }

    function saveSettings() {
        Lampa.Storage.set('mx_torrent_preload', settings);
    }

    loadSettings();

    // ===== MENU =====
    Lampa.Settings.add({
        id: 'mx_torrent_preload',
        title: 'MX Torrent Preload',
        icon: 'cloud_download',
        params: [
            {
                id: 'enabled',
                title: 'Bật preload torrent (remote)',
                type: 'toggle',
                value: settings.enabled,
                onchange: function (value) {
                    settings.enabled = value;
                    saveSettings();
                }
            }
        ]
    });

    // ===== PRELOAD TIME (REMOTE OPTIMIZED) =====
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

        // chỉ torrent stream
        if (!/torrserver|\/stream\//i.test(e.url)) return;

        var preload = settings.enabled;
        var size = e.size || (e.torrent && e.torrent.size);
        var preloadTime = preload ? getPreloadTime(size) : 0;

        console.log('[MX Torrent Preload]', {
            enabled: preload,
            size: size,
            preload: preloadTime
        });

        Lampa.Player.stop();

        setTimeout(function () {
            openMX(e.url, e.title);
        }, preloadTime * 1000);
    });

    // ===== OPEN MX PLAYER =====
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