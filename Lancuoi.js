(function () {
    'use strict';

    if (!window.Lampa) return;

    const TORRSERVE = 'https://gren439e.tsarea.tv:8443';

    const TSPreload = {
        name: 'TorrServe Smart Preload',
        version: '1.2.0',
        author: 'Hiền',

        init() {
            console.log('[TS Preload] Loaded');

            Lampa.Listener.follow('torrent', (event) => {
                if (event.type === 'select') {
                    this.preload(event.data);
                }
            });
        },

        preload(torrent) {
            if (!torrent || !torrent.url) return;

            const size = this.calcSize(torrent);

            console.log('[TS Preload] Preloading', size, 'MB');

            fetch(TORRSERVE + '/preload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    link: torrent.url,
                    preload: size
                })
            }).catch(err => {
                console.error('[TS Preload] Error', err);
            });
        },

        calcSize(torrent) {
            const q = torrent.quality || '';

            if (q.includes('2160')) return 600;
            if (q.includes('1080')) return 350;
            if (q.includes('720')) return 220;

            return 150;
        }
    };

    Lampa.Plugin.add(TSPreload.name, TSPreload);
    TSPreload.init();
})();
