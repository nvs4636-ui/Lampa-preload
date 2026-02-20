(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Preload + Clean Title] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== CLEAN & FORMAT TITLE (FIX x264 / SDR / HDR / DV) =====
    function formatTitle(e) {
        var title = e.title || 'Lampa Torrent';

        // Chuẩn hóa dấu phân cách
        title = title.replace(/[._]/g, ' ');

        // Xóa tag kỹ thuật
        title = title.replace(/\b(480p|720p|1080p|2160p|4k|x264|x265|h264|h265|hevc|avc|sdr|hdr|hdr10|hdr10\+|dolby\s?vision|dv|webrip|web\-dl|bluray|brrip|remux|aac|ac3|eac3|ddp|dts|truehd|5\.1|7\.1|yify|rarbg|ettv)\b/gi, '');

        // Xóa nội dung trong ngoặc có tag rác
        title = title.replace(/\[[^\]]*\]|\([^\)]*(1080p|720p|x264|x265|hdr|sdr)[^\)]*\)/gi, '');

        // Dọn khoảng trắng
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

        // Chỉ xử lý torrent
        if (!/torrserver|\/stream\//i.test(e.url)) return;

        var size = e.size || (e.torrent && e.torrent.size);
        var preload = getPreloadTime(size);
        var cleanTitle = formatTitle(e);

        console.log('[MX]', {
            title: cleanTitle,
            preload: preload
        });

        // Dừng player Lampa
        Lampa.Player.stop();

        // Preload rồi mở MX
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