(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Preload + RU Safe Title] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== DETECT CYRILLIC =====
    function hasCyrillic(text) {
        return /[А-Яа-яЁё]/.test(text);
    }

    // ===== CLEAN & FORMAT TITLE (ANTI-RU / UHD FIX) =====
    function formatTitle(e) {
        var title = '';

        // 1️⃣ Ưu tiên original_title (TMDB - tiếng Anh)
        if (e.original_title && !hasCyrillic(e.original_title)) {
            title = e.original_title;
        } else {
            title = e.title || 'Lampa Torrent';
        }

        // Chuẩn hóa
        title = title.replace(/[._]/g, ' ');

        // ❌ Xóa toàn bộ Cyrillic
        title = title.replace(/[А-Яа-яЁё]/g, '');

        // ❌ Xóa tag kỹ thuật (FULL)
        title = title.replace(/\b(
            uhd|4k|2160p|1080p|720p|
            x264|x265|h264|h265|hevc|avc|
            sdr|hdr|hdr10|hdr10\+|dolby\s?vision|dv|
            webrip|web\-dl|bluray|brrip|remux|
            aac|ac3|eac3|ddp|dts|truehd|
            atmos|10bit|8bit|
            rus|eng|multi|
            lq|hq
        )\b/gi, '');

        // ❌ Xóa nội dung trong [] và ()
        title = title.replace(/\[[^\]]*\]|\([^\)]*\)/g, '');

        // Dọn sạch
        title = title.replace(/\s+/g, ' ').trim();

        // Series
        if (e.season && e.episode) {
            return title +
                ' S' + String(e.season).padStart(2, '0') +
                'E' + String(e.episode).padStart(2, '0');
        }

        // Movie có năm
        if (e.year) {
            return title + ' (' + e.year + ')';
        }

        return title || 'Movie';
    }

    // ===== PRELOAD (LOW BUFFER ~32MB) =====
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

        console.log('[MX RU SAFE]', cleanTitle);

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