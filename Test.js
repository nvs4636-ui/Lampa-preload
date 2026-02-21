(function () {
    'use strict';

    // Xóa dấu vết cũ để không bị trùng lặp
    $('.menu__item[data-action="kkphim"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({mask: true, over: true});
        var items   = [];
        var html    = $('<div class="category-full"></div>'); // Dùng đúng class của LNUM
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self    = this;

        this.create = function () {
            var url = object.url || (api_host + 'danh-sach/phim-moi-cap-nhat');
            
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=' + (object.page || 1), function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                if (list.length) {
                    self.build(list);
                } else {
                    html.append('<div class="empty">Không có dữ liệu rồi ní!</div>');
                }
            }, function () {
                Lampa.Noty.show('Lỗi kết nối KKPhim!');
            });

            return scroll.render();
        };

        this.build = function (data) {
            data.forEach(function (item) {
                // Sử dụng Template chuẩn của Lampa giống LNUM
                var card = Lampa.Template.get('card', {
                    title: item.name,
                    release_year: item.year || '2025'
                });

                var poster = item.poster_url || item.thumb_url || '';
                card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);

                card.addClass('selector');

                // Sự kiện Click chuẩn Lampa
                card.on('click hover:enter', function (e) {
                    e.preventDefault();
                    self.getStream(item.slug, item.name);
                });

                html.append(card);
                items.push(card);
            });

            scroll.append(html);
            if (this.activity) this.activity.loader(false);
            scroll.update();
        };

        this.getStream = function (slug, title) {
            Lampa.Noty.show('Đang tải link...');
            network.silent(api_host + 'phim/' + slug, function (data) {
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var server = data.episodes[0].server_data;
                    Lampa.Select.show({
                        title: title,
                        items: server.map(function(ep) { 
                            return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; 
                        }),
                        onSelect: function(selected) { 
                            Lampa.Player.play(selected); 
                        }
                    });
                } else {
                    Lampa.Noty.show('Phim chưa có link!');
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                up: function () { Lampa.Select.show(); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
        };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        // Tạo menu giống LNUM nhưng màu đỏ KKPhim
        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="#e74c3c"><path d="M12 2L4 5V11C4 16.1 7.4 20.8 12 22C16.6 20.8 20 16.1 20 11V5L12 2Z"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click', function () {
            Lampa.Select.show({
                title: 'KKPhim',
                items: [
                    { title: 'Phim Mới Cập Nhật', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
                    { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
                    { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' },
                    { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh' }
                ],
                onSelect: function (sel) {
                    Lampa.Activity.push({
                        title: sel.title,
                        url: sel.url,
                        component: 'kkphim',
                        page: 1
                    });
                }
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
