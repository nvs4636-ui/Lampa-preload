(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Auto Buffer Detect] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== DETECT LOW BUFFER MODE =====
    function isLowBufferMode(e) {

        // 1. Remote TorrServer
        if (e.url && !/127\.0\.0\.1|localhost/i.test(e.url)) {
            return true;
        }

        // 2. Torrent lớn
        var size = e.size || (e.torrent && e.torrent.size);
        if (size && size > 3 * 1024 * 1024 * 1024) {
            return true;
        }

        // 3. Android RAM thấp (ước lượng)
        if (window.Android && Android.getMemoryClass) {
            try {
                var ram = Android.getMemoryClass(); // MB
                if (ram && ram <= 2048) return true;
            } catch (e) {}
        }

        // 4. MX Player Free (mặc định)
        return true;
    }

    // ===== PRELOAD TIME =====
    function getPreloadTime(size, low) {
        if (!size) return low ? 4 : 8;

        var gb = size / (1024 * 1024 * 1024);

        if (low) {
            if (gb <= 1) return 2;
            if (gb <= 3) return 4;
            if (gb <= 6) return 8;
            return 12;
        } else {
            if (gb <= 1) return 5;
            if (gb <= 3) return 10;
            if (gb <= 6) return 20;
            return 30;
        }
    }

    // ===== PLAYER HOOK =====
    Lampa.Listener.follow('player', function (e) {

        if (e.type !== 'start') return;
        if (!e.url) return;

        // chỉ xử lý torrent
        if (!/torrserver|\/stream\//i.test(e.url)) return;

        var lowBuffer = isLowBufferMode(e);
        var size = e.size || (e.torrent && e.torrent.size);
        var preload = getPreloadTime(size, lowBuffer);

        console.log('[MX Auto Buffer]', {
            lowBuffer: lowBuffer,
            preload: preload
        });

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
            console.log('[MX Auto Buffer] Android intent missing');
        }
    }

})();