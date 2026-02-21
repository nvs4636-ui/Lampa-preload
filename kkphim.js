(function () {
    'use strict';

    function startPlugin() {
        // 1. Kiểm tra nếu đã có menu KKPhim thì xóa đi trước khi thêm mới (để tránh đơ)
        $('.menu__item[data-component="kkphim"]').remove();

        // 2. Đăng ký Component hiển thị phim
        Lampa.Component.add('kkphim', function(object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({mask: true, over: true});
            var items = [];
            var html = $('<div></div>');
            var body = $('<div class="category-full"></div>');

            this.create = function() {
                var _this = this;
                var url = object.search ? 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(object.search) : 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=1';
                
                network.silent(url, function(data) {
                    var list = data.items || (data.data ? data.data.items : []);
                    html.empty().append(body);
                    if (list.length) {
                        list.forEach(function(item) {
                            var card = Lampa.Template.get('card', {
                                title: item.name,
                                img: (item.thumb_url.indexOf('http') > -1 ? '' : 'https://phimimg.com/') + item.thumb_url
                            });
                            card.on('click:select', function() {
                                // Gọi hàm phát phim
                                Lampa.Noty.show('Đang tải link...');
                                fetch('https://phimapi.com/phim/' + item.slug).then(r => r.json()).then(d => {
                                    var episodes = d.episodes[0].server_data;
                                    Lampa.Player.play({ url: episodes[0].link_m3u8, title: d.movie.name });
                                    Lampa.Player.playlist(episodes.map(e => ({title: e.name, url: e.link_m3u8})));
                                });
                            });
                            body.append(card);
                        });
                    } else {
                        body.append('<div class="selector" style="padding: 20px; text-align: center;">Không có dữ liệu</div>');
                    }
                });
                return html;
            };
            this.render = function() { return html; };
            this.destroy = function() { network.clear(); scroll.destroy(); html.remove(); };
        });

        // 3. Thêm vào menu với ID riêng để tránh lỗi hiển thị như trong ảnh
        var menu_item = {
            title: 'KKPhim',
            component: 'kkphim',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3s3 1.34 3 3-1.34 3-3 3-3-1.34-3-3z" fill="white"/></svg>',
            id: 'kkphim'
        };

        // Đưa menu lên đầu hoặc vị trí dễ thấy
        Lampa.Menu.add(menu_item);
        
        Lampa.Noty.show('KKPhim đã được cập nhật menu!');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
