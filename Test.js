(function () {
    'use strict';

    // --- 1. HỆ THỐNG QUẢN LÝ PLUGIN ---
    var plugin_name = 'KKPhim';
    var plugin_version = '2.0.5';
    
    // Tự động dọn dẹp để không bao giờ bị nhân bản menu
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
        var last_focus;

        // --- 2. CẤU TRÚC DANH MỤC CHUẨN LNUM ---
        var BASE_CATEGORIES = [
            { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat', type: 'new' },
            { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le', type: 'movie' },
            { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo', type: 'series' },
            { title: 'Hoạt Hình', url: api_host + 'v1/api/danh-sach/hoat-hinh', type: 'anime' },
            { title: 'TV Shows', url: api_host + 'v1/api/danh-sach/tv-shows', type: 'tv' },
            { title: 'Phim Vietsub', url: api_host + 'v1/api/danh-sach/sub-movies', type: 'sub' }
        ];

        this.create = function () {
            this.activity.loader(true);
            
            if (object.url) {
                this.loadGrid(object.url);
            } else {
                this.buildHome();
            }

            return scroll.render();
        };

        // --- 3. HÀM XỬ LÝ HÀNG ĐỢI (PARTS DATA) GIỐNG LNUM ---
        this.buildHome = function () {
            var partsData = [];

            BASE_CATEGORIES.forEach(function (cat) {
                partsData.push(function (callback) {
                    self.makeRequest(cat, function(row_html) {
                        if(row_html) body.append(row_html);
                        callback();
                    });
                });
            });

            // Kích hoạt load tuần tự để tránh lỗi getBoundingClientRect
            var loadNext = function () {
                if (partsData.length) {
                    var next = partsData.shift();
                    next(loadNext);
                } else {
                    self.finalize();
                }
            };
            
            scroll.append(body);
            loadNext();
        };

        this.makeRequest = function (cat, callback) {
            network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                
                if (list.length) {
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
                        Lampa.Activity.push({
                            title: cat.title,
                            url: cat.url,
                            component: 'kkphim',
                            page: 1
                        });
                    });

                    var container = row.find('.category-list__body');
                    list.slice(0, 12).forEach(function (item) {
                        var card = self.createCard(item);
                        container.append(card.render());
                        items.push(card);
                    });

                    callback(row);
                } else {
                    callback(null);
                }
            }, function() {
                callback(null);
            });
        };

        this.loadGrid = function (url) {
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=' + (object.page || 1), function (data) {
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

        this.createCard = function (item) {
            var card = Lampa.Template.get('card', {
                title: item.name,
                release_year: item.year || '2026'
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

        this.getDetail = function (slug, title) {
            Lampa.Noty.show('Đang tải tập phim...');
            network.silent(api_host + 'phim/' + slug, function (data) {
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var server = data.episodes[0].server_data;
                    Lampa.Select.show({
                        title: title,
                        items: server.map(function (ep) {
                            return { title: 'Tập ' + ep.name, url: ep.link_m3u8 };
                        }),
                        onSelect: function (selected) {
                            Lampa.Player.play(selected);
                        },
                        onBack: function() {
                            Lampa.Controller.toggle('content');
                        }
                    });
                }
            });
        };

        // --- 4. BỘ ĐIỀU KHIỂN NÂNG CAO (FIX LỖI KÉO XUỐNG) ---
        this.finalize = function () {
            var self = this;
            this.activity.loader(false);
            
            // Cực kỳ quan trọng: Update scroll sau khi DOM ổn định
            setTimeout(function() {
                scroll.update();
                self.start();
            }, 500);
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last_focus || false, scroll.render());
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
            body.remove();
            html.remove();
            items = [];
        };
    }

    // --- 5. GIAO DIỆN & CSS TRƯỜNG TỒN ---
    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $(`
            <li class="menu__item selector" data-action="kkphim">
                <div class="menu__ico">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
                        <path d="M19.5 13.5L12 21L4.5 13.5"/>
                        <path d="M12 3V21"/>
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

        // CSS ép chế độ SOLID và Fix scroll
        if (!$('#kk-style-pro').length) {
            $('head').append(`
                <style id="kk-style-pro">
                    .bar { background: #000 !important; opacity: 1 !important; visibility: visible !important; }
                    .category-list { padding-bottom: 150px; min-height: 101vh; } /* Ép có độ cao để scroll chạy */
                    .category-list__row { margin-bottom: 40px; }
                    .category-list__header { padding: 0 25px 15px; display: flex; align-items: center; }
                    .category-list__title { flex: 1; font-size: 2rem; font-weight: 900; color: #fff; }
                    .category-list__more { background: rgba(255,255,255,0.1); padding: 5px 15px; border-radius: 5px; }
                    .category-list__more.focus { background: #fff; color: #000; }
                    
                    .category-list__body { 
                        display: flex; 
                        overflow-x: auto; 
                        padding: 0 20px; 
                        gap: 20px; 
                        -webkit-overflow-scrolling: touch;
                    }
                    .category-list__body::-webkit-scrollbar { display: none; }
                    
                    /* Tỉ lệ poster giống LNUM */
                    .category-list__body .card { flex: 0 0 160px; width: 160px; }
                    .category-list__body .card__img { border-radius: 10px; box-shadow: 0 8px 25px rgba(0,0,0,0.8); }
                    
                    /* Grid Mode */
                    .category-full { display: flex; flex-wrap: wrap; padding: 25px; gap: 20px; }
                    .category-full .card { width: calc(25% - 20px); max-width: 180px; }
                </style>
            `);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
