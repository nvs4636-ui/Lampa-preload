(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Preload + Title Format] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== FORMAT TITLE FOR MX (VERY IMPORTANT) =====
    function formatTitle(e) {
        var title = e.title || 'Lampa Torrent';

        // Remove common junk
        title = title.replace(/\b(1080p|720p|2160p|4k|x264|x265|h264|h265|webrip|web-dl|bluray|hdr|dv)\b/gi, '')
                     .replace(/\.+/g, ' ')
                     .trim();

        // Series
        if (e.season && e.episode) {
            return title
                + ' S' + String(e.season).padStart(2, '0')
                + 'E' + String(e.episode).padStart(2, '0');
        }

        // Movie with year
        if (e.year) {
            return title + ' (' + e.year + ')';
        }

        return title;
    }

    // ===== PRELOAD TIME (LOW BUFFER ~32MB) =====
    function getPreloadTime(size) {
        if (!size) return 5;

        var gb = size / (1024 * 1024 * 1024);

        if (gb <= 1) return 3;
        if (gb <= 3) return 6;
        if (gb <= 6) return 12;
        return 18;
    }

    // ===== PLAYER HOOK =====
    Lampa.Listener.follow('player', function (e) {

        if (e.type !== 'start') return;
        if (!e.url) return;

        if (!/torrserver|\/stream\//i.test(e.url)) return;

        var size = e.size || (e.torrent && e.torrent.size);
        var preload = getPreloadTime(size);
        var title = formatTitle(e);

        console.log('[MX]', {
            title: title,
            preload: preload
        });

        Lampa.Player.stop();

        setTimeout(function () {
            openMX(e.url, title);
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
                title: title
            }
        };

        if (window.Android && Android.startActivity) {
            Android.startActivity(JSON.stringify(intent));
        } else {
            console.log('[MX] Android intent missing');
        }
    }

})();