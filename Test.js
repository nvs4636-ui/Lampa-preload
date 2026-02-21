(function () {
    'use strict';

    $('.menu__item[data-action="kkphim"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var body = $('<div class="category-full"></div>');
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self = this;

        this.create = function () {
            // Nếu là trang chủ tổng hợp (không có url cụ thể)
            if (!object.url) {
                this.buildHome();
            } else {
                this.loadCategory(object.url, object.title);
            }
            return scroll.render();
        };

        // Hàm xây dựng giao diện giống LNUM (Nhiều hàng có nút More)
        this.buildHome = function () {
            var categories = [
                { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat' },
                { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le' },
                { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo' },
                { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh' }
            ];

            categories.forEach(function (cat) {
                var row = $('<div class="category-list__row"><div class="category-list__title">' + cat.title + '</div><div class="category-list__more selector">Xem thêm</div><div class="category-list__body"></div></div>');
                
                // Nút "Xem thêm" (More) chuẩn LNUM
                row.find('.category-list__more').on('click hover:enter', function() {
                    Lampa.Activity.push({
                        title: cat.title,
                        url: cat.url,
                        component: 'kkphim',
                        page: 1
                    });
                });

                body.append(row);
                
                // Load demo vài phim cho mỗi hàng
                network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                    var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                    list.slice(0, 6).forEach(function (item) {
                        var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                        var poster = item.poster_url || item.thumb_url || '';
                        card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                        card.addClass('selector');
                        card.on('click hover:enter', function () { self.getStream(item.slug, item.name); });
                        row.find('.category-list__body').append(card);
                    });
                    scroll.update();
                });
            });

            scroll.append(body);
            if (this.activity) this.activity.loader(false);
        };

        // Hàm load danh sách đầy đủ khi bấm "More"
        this.loadCategory = function (url, title) {
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=' + (object.page || 1), function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                var grid = $('<div class="category-full"></div>');
                list.forEach(function (item) {
                    var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                    var poster = item.poster_url || item.thumb_url || '';
                    card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                    card.addClass('selector');
                    card.on('click hover:enter', function () { self.getStream(item.slug, item.name); });
                    grid.append(card);
                });
                scroll.append(grid);
                if (self.activity) self.activity.loader(false);
                scroll.update();
            });
        };

        this.getStream = function (slug, title) {
            Lampa.Loading.show();
            network.silent(api_host + 'phim/' + slug, function (data) {
                Lampa.Loading.hide();
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var server = data.episodes[0].server_data;
                    Lampa.Select.show({
                        title: title,
                        items: server.map(function(ep) { return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; }),
                        onSelect: function(selected) { Lampa.Player.play(selected); }
                    });
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

        this.render = function () { return scroll.render(); };
        
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            body.remove();
        };
    }

    // Đăng ký Plugin
    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" fill="#2ecc71"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click hover:enter', function () {
            Lampa.Activity.push({
                title: 'KKPhim Home',
                component: 'kkphim',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);

        // Thêm CSS để hiện hàng ngang giống LNUM
        if (!$('#kk-style').length) {
            $('head').append(`<style id="kk-style">
                .category-list__row { margin-bottom: 20px; overflow: hidden; }
                .category-list__title { font-size: 1.5em; margin-bottom: 10px; display: inline-block; padding-left: 10px; }
                .category-list__more { float: right; background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 5px; margin-right: 10px; cursor: pointer; }
                .category-list__more.focus { background: #fff; color: #000; }
                .category-list__body { display: flex; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch; }
                .category-list__body .card { flex: 0 0 150px; margin-right: 10px; }
            </style>`);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
