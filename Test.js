(function () {
    'use strict';

    // Dọn rác cũ để tránh trùng lặp menu
    $('.menu__item[data-action="kkphim"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({mask: true, over: true});
        var items   = [];
        var html    = $('<div class="category-full"></div>');
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self    = this;

        // Cấu trúc 6 mục chuẩn theo LNUM ní yêu cầu
        var BASE_CATEGORIES = {
            movies: { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat' },
            tv: { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le' },
            cartoons: { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo' },
            anime: { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh' },
            tv_shows: { title: 'TV Shows', url: api_host + 'v1/api/danh-sach/tv-shows' },
            vietsub: { title: 'Phim Vietsub', url: api_host + 'v1/api/danh-sach/sub-movies' }
        };

        this.create = function () {
            if (object.url) {
                this.makeRequest(object.url, true);
            } else {
                this.buildHome();
            }
            return scroll.render();
        };

        // Giữ nguyên hàm makeRequest thần thánh của LNUM để tránh lỗi getBoundingClientRect
        this.makeRequest = function (url, is_grid) {
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=' + (object.page || 1), function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                if (is_grid) {
                    self.buildGrid(list);
                } else {
                    // Xử lý row ngang ở đây nếu cần
                }
            });
        };

        this.buildHome = function () {
            var partsData = [];

            // Duyệt qua 6 mục y hệt cấu trúc ảnh ní gửi
            Object.keys(BASE_CATEGORIES).forEach(function (key) {
                var cat = BASE_CATEGORIES[key];
                partsData.push(function (callback) {
                    var row = $(`
                        <div class="category-list__row">
                            <div class="category-list__header">
                                <div class="category-list__title">${cat.title}</div>
                                <div class="category-list__more selector">More</div>
                            </div>
                            <div class="category-list__body"></div>
                        </div>
                    `);

                    row.find('.category-list__more').on('click', function () {
                        Lampa.Activity.push({ title: cat.title, url: cat.url, component: 'kkphim', page: 1 });
                    });

                    network.silent(cat.url + '?page=1', function (data) {
                        var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                        var body = row.find('.category-list__body');
                        
                        list.slice(0, 8).forEach(function (item) {
                            var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                            var poster = item.poster_url || item.thumb_url || '';
                            card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                            card.addClass('selector');
                            card.on('click', function () { self.getStream(item.slug, item.name); });
                            body.append(card);
                        });
                        
                        html.append(row);
                        callback(); // Quan trọng: Đợi load xong mới tiếp tục để tránh văng xanh
                    });
                });
            });

            // Hàm kích hoạt chuỗi load của LNUM
            var proceed = function () {
                if (partsData.length) {
                    partsData.shift()(proceed);
                } else {
                    scroll.update();
                }
            };
            proceed();
            scroll.append(html);
        };

        this.buildGrid = function (data) {
            var grid = $('<div class="category-full"></div>');
            data.forEach(function (item) {
                var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                var poster = item.poster_url || item.thumb_url || '';
                card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                card.addClass('selector');
                card.on('click', function () { self.getStream(item.slug, item.name); });
                grid.append(card);
            });
            scroll.append(grid);
            scroll.update();
        };

        this.getStream = function (slug, title) {
            Lampa.Noty.show('Đang tải link phim...');
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
            Lampa.Activity.push({ title: 'KKPhim Home', component: 'kkphim', page: 1 });
        });
        $('.menu .menu__list').append(menu_item);

        // CSS ép thanh bar đen đặc không trong suốt
        if (!$('#kk-style-lnum').length) {
            $('head').append(`<style id="kk-style-lnum">
                .bar { background: #000 !important; opacity: 1 !important; border-top: 1px solid #333; }
                .category-list__row { margin-bottom: 25px; }
                .category-list__header { display: flex; align-items: center; padding: 0 20px 10px; }
                .category-list__title { flex-grow: 1; font-size: 1.6rem; font-weight: bold; color: #fff; }
                .category-list__more { background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 4px; }
                .category-list__more.focus { background: #fff; color: #000; }
                .category-list__body { display: flex; overflow-x: auto; padding: 0 15px; gap: 15px; -webkit-overflow-scrolling: touch; }
                .category-list__body::-webkit-scrollbar { display: none; }
                .category-list__body .card { flex: 0 0 145px; width: 145px; }
            </style>`);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
