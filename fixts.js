(function () {
    'use strict';

    if (!window.Lampa) return;

    var plugin_name = 'TorrServer Cache Optimizer';

    // Clear cache Lampa
    function clearLampaCache() {
        try {
            Lampa.Storage.clear();
            if (Lampa.Cache) Lampa.Cache.clear();
            console.log('[TS] Lampa cache cleared');
        } catch (e) {
            console.log('[TS] Cache clear error', e);
        }
    }

    // Reset TorrServer session
    function resetTorrServer() {
        try {
            if (Lampa.Torrent && Lampa.Torrent.stop) {
                Lampa.Torrent.stop();
                console.log('[TS] Torrent stopped');
            }
        } catch (e) {
            console.log('[TS] Torrent stop error', e);
        }
    }

    // Hook player
    Lampa.Listener.follow('player', function (event) {

        // Chỉ áp dụng cho torrent
        if (event.type === 'before' && event.data && event.data.torrent) {

            console.log('[TS] Before torrent play');

            // Ngắt player hiện tại
            try {
                Lampa.Player.stop();
            } catch (e) {}

            // Reset torrent + cache
            resetTorrServer();
            clearLampaCache();

            // Delay cho TorrServer giải phóng RAM
            setTimeout(function () {
                Lampa.Player.play();
            }, 500);

            // Chặn play gốc
            return false;
        }
    });

    // Tắt preload khi app start
    Lampa.Listener.follow('app', function (event) {
        if (event.type === 'ready') {

            Lampa.Settings.update('preload', false);
            Lampa.Settings.update('history', false);

            Lampa.Menu.add({
                title: plugin_name,
                onSelect: function () {
                    Lampa.Noty.show('TorrServer cache optimizer đang chạy');
                }
            });
        }
    });

})();