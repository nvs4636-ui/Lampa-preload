(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Preload RU FIX] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== CYRILLIC DETECT =====
    function hasCyrillic(text) {
        return /[А-Яа-яЁё]/.test(text);
    }

    // ===== CLEAN & FORMAT TITLE (SAFE) =====
    function formatTitle(e) {
        var title = '';

        if (e.original_title && !hasCyrillic(e.original_title)) {
            title = e.original_title;
        } else {
            title = e.title || 'Movie';
        }

        title = title.replace(/[._]/g, ' ');
        title = title.replace(/[А-Яа-яЁё]/g, '');

        // ❌ TAG REMOVAL (ONE LINE REGEX - SAFE)
        title = title.replace(/\b(uhd|4k|2160p|1080p|720p|x264|x265|h264|h265|hevc|avc|sdr|hdr|hdr10|hdr10\+|dolby\s?vision|dv|webrip|web\-dl|bluray|brrip|remux|aac|ac3|eac3|ddp|dts|truehd|atmos|10bit|8bit|rus|eng|multi|lq|hq)\b/gi, '');

        title = title.replace(/\[[^\]]*\]|\([^\)]*\)/g, '');
        title = title.replace(/\s+/g, ' ').trim();

        if (e.season && e.episode) {
            return title + ' S' + String(e.season).padStart(2, '0') +
                'E' + String(e.episode).padStart(2, '0');
        }

        if (e.year) {
            return title + ' (' + e.year + ')';
        }

        return title;
    }

    // ===== PRELOAD TIME (CACHE ~32MB) =====
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
        var cleanTitle = formatTitle(e);

        console.log('[MX PRELOAD]', cleanTitle);

        Lampa.Player.stop();

        setTimeout(function () {
            openMX(e.url, cleanTitle);
        }, preload * 1000);
    });

    // ===== OPEN MX PLAYER =====
    function openMX(url, title) {
        var intent = {
            action: 'android.intent.action.VIEW',
            type: 'video/*',
            package: MX_PACKAGE,
            data: url,
            extras: { title: title }
        };

        if (window.Android && Android.startActivity) {
            Android.startActivity(JSON.stringify(intent));
        }
    }

})();