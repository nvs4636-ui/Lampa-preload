(function () {
    'use strict';

    if (!window.Lampa) return;

    let serverUrl = Lampa.Storage.get('ts_preload_server', 'https://gren439e.tsarea.tv:8443');

    const TSPreload = {
        name: 'TorrServe Smart Preload',
        version: '1.5.0',
        author: 'Hiền',

        init() {
            console.log('[TS Preload] Plugin đã khởi tạo');

            // Thêm menu cài đặt trong Lampa
            Lampa.Settings.add({
                title: 'TorrServe Smart Preload',
                component: this.settingsComponent.bind(this),
                onBack: () => Lampa.Settings.update()
            });

            // Thêm nút "Play trực tiếp" vào menu torrent
            Lampa.Listener.follow('torrent', (event) => {
                if (event.type === 'menu') {
                    event.data.push({
                        title: '▶ Play trực tiếp (TorrServe)',
                        subtitle: 'Phát ngay qua stream/start',
                        onSelect: () => this.startStream(event.torrent)
                    });
                }
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

            // Nút test connection
            let btn = $('<button style="margin-top:10px;">Test Connection</button>');
            btn.on('click', () => {
                fetch(serverUrl + '/stream/start', { method: 'GET' })
                    .then(r => {
                        if (r.ok) alert('✅ TorrServe hoạt động!');
                        else alert('❌ TorrServe không phản hồi');
                    })
                    .catch(() => alert('❌ Không kết nối được TorrServe'));
            });

            ui.append(input);
            ui.append(btn);

            return ui;
        },

        preload(torrent) {
            if (!torrent || !torrent.url) return;

            const size = this.calcSize(torrent);

            console.log('[TS Preload] Preload', size, 'MB');

            fetch(serverUrl + '/stream/start', {
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

        startStream(torrent) {
            if (!torrent || !torrent.url) return;

            console.log('[TS Preload] Play trực tiếp:', torrent.url);

            fetch(serverUrl + '/stream/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    link: torrent.url,
                    preload: 300 // preload mặc định khi play trực tiếp
                })
            })
            .then(() => {
                alert('▶ Đã gửi yêu cầu phát trực tiếp đến TorrServe');
            })
            .catch(err => {
                console.error('[TS Preload] Lỗi play trực tiếp:', err);
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
