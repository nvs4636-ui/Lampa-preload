(function () {
    'use strict';

    if (!window.Lampa) return;

    Lampa.Plugin.add('KKPhim Test', {
        type: 'online',

        play: function (source, item) {
            return Promise.resolve([
                {
                    title: 'Test button',
                    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                    server: 'kkphim',
                    class: 'kkphim'
                }
            ]);
        }
    });
})();