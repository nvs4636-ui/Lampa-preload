(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX PRELOAD + POPUP COPY] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== BUILD CLEAN TITLE (TMDB ONLY) =====
    function buildTitle(e) {
        var title = '';

        if (e.original_title) {
            title = e.original_title;
        } else if (e.name) {
            title = e.name;
        } else {
            title = 'Movie';
        }

        if (e.season && e.episode) {
            title += ' S' + String(e.season).padStart(2, '0') +
                     'E' + String(e.episode).padStart(2, '0');
        } else if (e.year) {
            title += ' ' + e.year;
        }

        return title;
    }

    // ===== POPUP COPY TITLE (SAFE WAY) =====
    function showCopyPopup(title) {
        if (!Lampa.Modal) return;

        var html =
            '<div style="padding:16px;font-size:18px;word-break:break-word;">' +
            '<div style="margin-bottom:10px;font-weight:bold;">Tên phim để tìm phụ đề</div>' +
            '<div style="background:#1e1e1e;padding:12px;border-radius:8px;' +
            'user-select:text;-webkit-user-select:text;">' +
            title +
            '</div>' +
            '<div style="margin-top:10px;font-size:13px;opacity:.7;">' +
            '👉 Giữ để copy, rồi dán vào tìm phụ đề trong MX Player' +
            '</div>' +
            '</div>';

        Lampa.Modal.open({
            title: 'Subtitle Helper',
            html: html,
            size: 'small'
        });
    }

    // ===== FAKE FILENAME FOR MX =====
    function fakeUrl(url, title) {
        var safe = title
            .replace(/[^a-z0-9\s.]/gi, '')
            .replace(/\s+/g, '.');

        if (/\.(mkv|mp4|avi)$/i.test(url)) return url;

        if (url.indexOf('?') > -1) {
            return url.replace('?', '/' + safe + '.mkv?');
        } else {
            return url + '/' + safe + '.mkv';
        }
    }

    // ===== PRELOAD TIME (CACHE ~32MB) =====
    function preloadTime(size) {
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

        var title = buildTitle(e);
        var url   = fakeUrl(e.url, title);
        var size  = e.size || (e.torrent && e.torrent.size);
        var wait  = preloadTime(size);

        console.log('[MX START]', title);

        // 👉 SHOW POPUP COPY TITLE
        showCopyPopup(title);

        // Stop player mặc định của Lampa
        Lampa.Player.stop();

        // Preload rồi mới mở MX
        setTimeout(function () {
            openMX(url, title);
        }, wait * 1000);
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