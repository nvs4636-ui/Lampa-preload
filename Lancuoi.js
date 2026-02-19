(function () {
    'use strict';

    if (!window.Lampa) return;

    let serverUrl = Lampa.Storage.get('ts_preload_server', 'https://gren439e.tsarea.tv:8443');

    const TSPreload = {
        name: 'TorrServe Smart Preload',
        version: '1.3.0',
        author: 'Hiền',

        init() {
            console.log('[TS Preload] Plugin đã khởi tạo');

            // Thêm menu cài đặt trong Lampa
            Lampa.Settings.add({
                title: 'TorrServe Smart Preload',
                component: this.settingsComponent.bind(this),
                onBack: () => Lampa.Settings.update()
            });

            // Theo dõi sự kiện chọn torrent
            Lampa.Listener.follow('torrent', (event) => {
                if (event.type === 'select') {
                    this.preload(event.data);
                }
            });
        },

        settingsComponent() {
            let ui = $('<div class="settings-content"></div>');

            ui.append('<div class="settings-title">Địa chỉ TorrServe</div>');

            let input = $('<input type="text" style="width:100%; padding:5px;" />');
            input.val(serverUrl);

            input.on('change', () => {
                serverUrl = input.val();
                Lampa.Storage.set('ts_preload_server', serverUrl);
                console.log('[TS Preload] Server URL cập nhật:', serverUrl);
            });

            ui.append(input);

            return ui;
        },

        preload(torrent) {
            if (!torrent || !torrent.url) return;

            const size = this.calcSize(torrent);

            console.log('[TS Preload] Preload', size, 'MB');

            fetch(serverUrl + '/preload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    link: torrent.url,
                    preload: size
                })
            }).catch(err => {
                console.error('[TS Preload] Lỗi preload:', err);
            });
        },

        calcSize(torrent) {
            const q = torrent.quality || '';

            if (q.includes('2160')) return 600;   // 4K
            if (q.includes('1080')) return 350;   // Full HD
            if (q.includes('720')) return 220;    // HD

            return 150; // mặc định
        }
    };

    Lampa.Plugin.add(TSPreload.name, TSPreload);
    TSPreload.init();
})();
