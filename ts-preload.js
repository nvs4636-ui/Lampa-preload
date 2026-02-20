(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX XPLAYER MODE] Loaded');

    var MX_PACKAGE = 'com.mxtech.videoplayer.ad';

    // ===== BUILD TMDB TITLE ONLY =====
    function buildTitle(e) {

        var title = '';

        // Movie
        if (e.original_title) {
            title = e.original_title;
        }
        // Series fallback
        else if (e.name) {
            title = e.name;
        }
        else {
            title = 'Movie';
        }

        // Series format
        if (e.season && e.episode) {
            title += ' S' + String(e.season).padStart(2, '0') +
                     'E' + String(e.episode).padStart(2, '0');
        }
        // Movie year
        else if (e.year) {
            title += '.' + e.year;
        }

        return title;
    }

    // ===== FAKE FILENAME INTO STREAM URL =====
    function buildFakeUrl(url, title) {

        // Clean title for filename
        var safe = title
            .replace(/[^a-z0-9\s.]/gi, '')
            .replace(/\s+/g, '.');

        // If already has extension → skip
        if (/\.(mkv|mp4|avi)$/i.test(url)) return url;

        // Append fake filename
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
        var url   = buildFakeUrl(e.url, title);
        var size  = e.size || (e.torrent && e.torrent.size);
        var wait  = preloadTime(size);

        console.log('[MX XPLAYER]', title);

        // Stop default player
        Lampa.Player.stop();

        // Preload delay
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
            extras: {
                title: title
            }
        };

        if (window.Android && Android.startActivity) {
            Android.startActivity(JSON.stringify(intent));
        }
    }

})();