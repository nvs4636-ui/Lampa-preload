(function () {
    'use strict';

    // --- KHỞI TẠO & DỌN DẸP HỆ THỐNG ---
    $('.menu__item[data-action="kkphim"]').remove();
    $('[id^="kk-style"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({
            mask: true,
            over: true,
            step: 250
        });
        var items = [];
        var html = $('<div class="category-full"></div>');
        var body = $('<div class="category-list"></div>');
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self = this;
        var info;

        // --- CẤU TRÚC 6 DANH MỤC CHUẨN LNUM ---
        var BASE_CATEGORIES = [
            { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat', type: 'new' },
            { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le', type: 'movie' },
            { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo', type: 'series' },
            { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh', type: 'anime' },
            { title: 'TV Shows', url: api_host + 'v1/api/danh-sach/tv-shows', type: 'tv' },
            { title: 'Phim Vietsub', url: api_host + 'v1/api/danh-sach/sub-movies', type: 'sub' }
        ];

        this.create = function () {
            var self = this;
            this.activity.loader(true);

            if (object.url) {
                // Trang danh sách đầy đủ (Grid)
                this.loadGrid(object.url);
            } else {
                // Trang chủ chia hàng (Home)
                this.buildHome();
            }

            return scroll.render();
        };

        // --- HÀM LOAD TRANG CHỦ (GIỮ LOGIC LNUM) ---
        this.buildHome = function () {
            var partsData = [];

            BASE_CATEGORIES.forEach(function (cat) {
                partsData.push(function (callback) {
                    var row = $(`
                        <div class="category-list__row">
                            <div class="category-list__header">
                                <div class="category-list__title">${cat.title}</div>
                                <div class="category-list__more selector">Xem thêm</div>
                            </div>
                            <div class="category-list__body"></div>
                        </div>
                    `);

                    row.find('.category-list__more').on('click', function () {
                        Lampa.Activity.push({
                            title: cat.title,
                            url: cat.url,
                            component: 'kkphim',
                            page: 1
                        });
                    });

                    network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                        var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                        var container = row.find('.category-list__body');

                        list.slice(0, 10).forEach(function (item) {
                            var card = self.createCard(item);
                            container.append(card.render());
                            items.push(card);
                        });

                        body.append(row);
                        callback();
                    }, function() {
                        callback(); // Bỏ qua nếu lỗi mục này
                    });
                });
            });

            // Gọi đệ quy để load tuần tự như LNUM
            var loadNext = function () {
                if (partsData.length) {
                    partsData.shift()(loadNext);
                } else {
                    self.finalize();
                }
            };
            loadNext();

            scroll.append(body);
        };

        // --- HÀM LOAD DANH SÁCH FULL (GRID) ---
        this.loadGrid = function (url) {
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=' + object.page, function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                
                list.forEach(function (item) {
                    var card = self.createCard(item);
                    html.append(card.render());
                    items.push(card);
                });

                scroll.append(html);
                self.finalize();
            });
        };

        // --- HÀM TẠO CARD CHUẨN LAMPA TEMPLATE ---
        this.createCard = function (item) {
            var card = Lampa.Template.get('card', {
                title: item.name,
                release_year: item.year || '2025'
            });

            var img = item.poster_url || item.thumb_url || '';
            card.find('.card__img').attr('src', img.includes('http') ? img : img_proxy + img);
            card.addClass('selector');

            card.on('click', function () {
                self.getDetail(item.slug, item.name);
            });

            return {
                render: function () { return card; },
                content: function () { return card; }
            };
        };

        // --- HÀM LẤY CHI TIẾT & PHÁT PHIM ---
        this.getDetail = function (slug, title) {
            Lampa.Noty.show('Đang kết nối server...');
            network.silent(api_host + 'phim/' + slug, function (data) {
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var episodes = data.episodes[0].server_data;
                    
                    if (episodes.length === 1) {
                        Lampa.Player.play({ url: episodes[0].link_m3u8, title: title });
                    } else {
                        Lampa.Select.show({
                            title: title,
                            items: episodes.map(function (ep) {
                                return { title: 'Tập ' + ep.name, url: ep.link_m3u8 };
                            }),
                            onSelect: function (selected) {
                                Lampa.Player.play(selected);
                            },
                            onBack: function () {
                                Lampa.Controller.toggle('content');
                            }
                        });
                    }
                } else {
                    Lampa.Noty.show('Phim đang cập nhật link!');
                }
            });
        };

        // --- CÁC HÀM HỖ TRỢ ĐIỀU KHIỂN ---
        this.finalize = function () {
            this.activity.loader(false);
            scroll.update();
            this.start();
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                up: function () {
                    Lampa.Select.show();
                },
                back: function () {
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.toggle('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return scroll.render(); };
        
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            if (info) info.remove();
            body.remove();
            html.remove();
            items = [];
        };
    }

    // --- CÀI ĐẶT MENU & CSS SOLID (ĐẬP CSS CŨ) ---
    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $(`
            <li class="menu__item selector" data-action="kkphim">
                <div class="menu__ico">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                </div>
                <div class="menu__text">KKPhim</div>
            </li>
        `);

        menu_item.on('click', function () {
            Lampa.Activity.push({
                title: 'KKPhim',
                component: 'kkphim',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);

        // --- CSS ÉP BỐ CỤC CHUẨN LNUM & THANH BAR ĐEN ---
        if (!$('#kk-style-lnum-v3').length) {
            $('head').append(`
                <style id="kk-style-lnum-v3">
                    /* Khắc phục thanh bar trong suốt */
                    .bar { background: #000000 !important; opacity: 1 !important; border-top: 1px solid #222; height: 70px !important; z-index: 100; }
                    .bar__item { opacity: 1 !important; }
                    
                    /* Bố cục danh sách hàng ngang */
                    .category-list { padding: 20px 0 100px 0; background: #141414; }
                    .category-list__row { margin-bottom: 30px; }
                    .category-list__header { display: flex; align-items: center; padding: 0 20px 10px; }
                    .category-list__title { flex-grow: 1; font-size: 1.8rem; font-weight: 800; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
                    .category-list__more { background: rgba(255,255,255,0.1); color: #aaa; padding: 5px 15px; border-radius: 20px; font-size: 1rem; transition: all 0.3s; }
                    .category-list__more.focus { background: #fff; color: #000; transform: scale(1.05); }
                    
                    /* Cuộn ngang mượt mà cho Android */
                    .category-list__body { display: flex; overflow-x: auto; padding: 10px 20px; gap: 15px; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
                    .category-list__body::-webkit-scrollbar { display: none; }
                    
                    /* Tỉ lệ card phim chuẩn */
                    .category-list__body .card { flex: 0 0 150px; width: 150px; transition: transform 0.2s; }
                    .category-list__body .card.focus { transform: scale(1.05); z-index: 10; }
                    .category-list__body .card__img { border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }
                    
                    /* Lưới phim trang Grid */
                    .category-full { display: flex; flex-wrap: wrap; padding: 20px; gap: 15px; justify-content: flex-start; }
                    .category-full .card { width: calc(33.33% - 10px); max-width: 160px; margin-bottom: 10px; }

                    /* Khắc phục lỗi xanh màn */
                    .scroll__content { min-height: 101vh; }
                </style>
            `);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
