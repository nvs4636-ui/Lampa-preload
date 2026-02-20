(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX PRELOAD + AUTO COPY] Loaded');

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

    // ===== COPY TO CLIPBOARD =====
    function copyToClipboard(text) {
        try {
            if (window.Android && Android.setClipboard) {
                Android.setClipboard(text);
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(text);
            }
            console.log('[CLIPBOARD]', text);
        } catch (e) {
            console.log('Clipboard error', e);
        }
    }

    // ===== FAKE FILENAME FOR MX (OPTIONAL BUT HELPS) =====
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

        // 👉 AUTO COPY TITLE
        copyToClipboard(title);

        // 👉 Thông báo nhẹ
        if (Lampa.Noty) {
            Lampa.Noty.show('Đã copy tên phim: ' + title);
        }

        console.log('[MX START]', title);

        // Stop player mặc định
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