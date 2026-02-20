(function () {
    'use strict';

    if (!window.Lampa) return;

    console.log('[MX Preload Torrent] Loaded');

    // Cấu hình
    var MX_PACKAGE = 'com.mxtech.videoplayer.ad'; // hoặc com.mxtech.videoplayer.pro
    var PRELOAD_TIME = 30; // giây preload trước khi play

    // Hook khi phát video
    Lampa.Listener.follow('player', function (e) {

        if (e.type !== 'start') return;
        if (!e.url) return;

        // Chỉ xử lý stream từ torrent
        if (!e.url.match(/localhost|127\.0\.0\.1|torrserver|\/stream\//i)) return;

        console.log('[MX Preload Torrent] Stream URL:', e.url);

        // Dừng player mặc định của Lampa
        Lampa.Player.stop();

        // Delay preload
        setTimeout(function () {

            var intent = {
                action: 'android.intent.action.VIEW',
                type: 'video/*',
                package: MX_PACKAGE,
                data: e.url,
                extras: {
                    'position': 0,
                    'return_result': false,
                    'title': e.title || 'Lampa Torrent'
                }
            };

            // Gửi intent mở MX Player
            if (window.Android && Android.startActivity) {
                Android.startActivity(JSON.stringify(intent));
            } else {
                console.log('[MX Preload Torrent] Android intent not available');
            }

        }, PRELOAD_TIME * 1000);
    });

})();