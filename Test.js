(function () {
    'use strict';

    $('.menu__item[data-action="kkphim"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self = this;

        this.create = function () {
            // Nếu có url cụ thể thì load Grid (trang More), nếu không thì load Home
            if (object.url) {
                this.loadCategory(object.url);
            } else {
                this.buildHome();
            }
            return scroll.render();
        };

        this.buildHome = function () {
            var partsData = [];

            // Cấu trúc 6 mục chuẩn như ảnh ní gửi
            var BASE_CATEGORIES = [
                { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat' },
                { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le' },
                { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo' },
                { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh' },
                { title: 'TV Shows', url: api_host + 'v1/api/danh-sach/tv-shows' },
                { title: 'Phim Vietsub', url: api_host + 'v1/api/danh-sach/sub-movies' }
            ];

            // Đẩy vào hàng đợi load thủ công như LNUM
            BASE_CATEGORIES.forEach(function(cat) {
                partsData.push(function(callback) {
                    var row = $(`
                        <div class="category-list__row">
                            <div class="category-list__header">
                                <div class="category-list__title">${cat.title}</div>
                                <div class="category-list__more selector">More</div>
                            </div>
                            <div class="category-list__body"></div>
                        </div>
                    `);

                    row.find('.category-list__more').on('click', function() {
                        Lampa.Activity.push({ title: cat.title, url: cat.url, component: 'kkphim', page: 1 });
                    });

                    network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function(data) {
                        var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                        var body = row.find('.category-list__body');
                        
                        list.slice(0, 7).forEach(function(item) {
                            var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                            var poster = item.poster_url || item.thumb_url || '';
                            card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                            card.addClass('selector');
                            card.on('click', function() { self.getStream(item.slug, item.name); });
                            body.append(card);
                        });
                        
                        html.append(row);
                        callback(); // Xong mục này mới load tiếp mục sau
                    });
                });
            });

            // Kích hoạt hàng đợi load
            var loadNext = function() {
                if (partsData.length) {
                    var next = partsData.shift();
                    next(loadNext);
                } else {
                    scroll.update();
                }
            };
            loadNext();

            scroll.append(html);
        };

        this.loadCategory = function (url) {
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                var grid = $('<div class="category-full"></div>');
                list.forEach(function (item) {
                    var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                    var poster = item.poster_url || item.thumb_url || '';
                    card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                    card.addClass('selector');
                    card.on('click', function () { self.getStream(item.slug, item.name); });
                    grid.append(card);
                });
                scroll.append(grid);
                scroll.update();
            });
        };

        this.getStream = function (slug, title) {
            Lampa.Noty.show('Đang lấy link...');
            network.silent(api_host + 'phim/' + slug, function (data) {
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
        this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);
        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="#e74c3c"><path d="M12 2L4 5V11C4 16.1 7.4 20.8 12 22C16.6 20.8 20 16.1 20 11V5L12 2Z"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click', function () {
            Lampa.Activity.push({ title: 'KKPhim', component: 'kkphim', page: 1 });
        });
        $('.menu .menu__list').append(menu_item);

        // CSS ép giao diện đen đặc và hàng ngang mượt như LNUM
        if (!$('#kk-lnum-style').length) {
            $('head').append(`<style id="kk-lnum-style">
                .bar { background: #000 !important; opacity: 1 !important; }
                .category-list__row { margin-bottom: 25px; }
                .category-list__header { display: flex; align-items: center; padding: 0 20px 10px; }
                .category-list__title { flex-grow: 1; font-size: 1.5rem; font-weight: bold; color: #fff; text-transform: uppercase; }
                .category-list__more { background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 4px; font-size: 0.9rem; }
                .category-list__more.focus { background: #fff; color: #000; }
                .category-list__body { display: flex; overflow-x: auto; padding: 0 15px; gap: 10px; -webkit-overflow-scrolling: touch; }
                .category-list__body::-webkit-scrollbar { display: none; }
                .category-list__body .card { flex: 0 0 140px; width: 140px; }
            </style>`);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
