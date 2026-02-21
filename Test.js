(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        // Cấu hình scroll tối ưu cho cả Vuốt (Touch) và Remote
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var items = [];
        var body = $('<div class="category-full"></div>'); 
        
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var page = 1;
        var total_pages = 1;
        var loading = false;
        var self = this;

        this.create = function () {
            // Nhét body vào bộ cuộn
            scroll.append(body);

            // Tự load trang tiếp khi vuốt xuống cuối
            scroll.onEnd = function () {
                if (!loading && page < total_pages) {
                    page++;
                    self.load();
                }
            };

            this.load();
            return this.render();
        };

        this.load = function () {
            loading = true;
            if (page === 1 && this.activity) this.activity.loader(true); 

            var query = object.search || (object.movie && object.movie.title) || '';
            var url = query ? 
                api_host + 'v1/api/tim-kiem?keyword=' + encodeURIComponent(query) + '&page=' + page :
                (object.url || api_host + 'danh-sach/phim-moi-cap-nhat') + (object.url && object.url.includes('?') ? '&' : '?') + 'page=' + page;

            network.silent(url, function (data) {
                var raw_items = (data.data && data.data.items) ? data.data.items : (data.items || []);
                var pagination = (data.data && data.data.params && data.data.params.pagination) ? data.data.params.pagination : (data.params && data.params.pagination ? data.params.pagination : null);
                if (pagination) total_pages = Math.ceil(pagination.totalItems / pagination.totalItemsPerPage);

                self.append(raw_items);
                loading = false;
            }, function () {
                self.empty('Lỗi kết nối KKPhim!');
                loading = false;
            });
        };

        this.append = function (data) {
            if (data.length === 0 && page === 1) return this.empty('Không tìm thấy phim!');

            data.forEach(function (item) {
                if (!item) return;
                var card = Lampa.Template.get('card', {
                    title: item.name || 'Phim',
                    release_year: item.year || ''
                });

                var poster = item.poster_url || item.thumb_url || '';
                card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);

                card.on('hover:enter', function () {
                    self.getStream(item.slug, item.name);
                });

                card.addClass('selector');
                body.append(card);
                items.push(card);
            });

            if (this.activity) {
                this.activity.loader(false);
                this.activity.toggle(); 
            }

            // Ép cập nhật chiều cao để kích hoạt thanh cuộn
            setTimeout(function() {
                try { scroll.update(); } catch(e) {}
            }, 100);
        };

        this.empty = function (msg) {
            body.append('<div class="empty">' + msg + '</div>');
            if (this.activity) { this.activity.loader(false); this.activity.toggle(); }
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

        this.getStream = function (slug, title) {
            Lampa.Loading.show();
            network.silent(api_host + 'phim/' + slug, function (data) {
                Lampa.Loading.hide();
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var server = data.episodes[0].server_data;
                    if (server.length === 1) {
                        Lampa.Player.play({ url: server[0].link_m3u8, title: title });
                    } else {
                        Lampa.Select.show({
                            title: 'Chọn tập phim',
                            items: server.map(function(ep) { return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; }),
                            onSelect: function(selected) { Lampa.Player.play(selected); }
                        });
                    }
                }
            });
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            body.remove();
        };
    }

    function startPlugin() {
        // --- BƯỚC 1: DỌN DẸP MENU TRÙNG LẶP ---
        $('.menu__item[data-action="kkphim"]').remove();
        
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 12L3 7L12 2L21 7Z" fill="#e74c3c"/><path d="M21 17L12 22L3 17" stroke="#e74c3c" stroke-width="2"/><path d="M21 12L12 17L3 12" stroke="#e74c3c" stroke-width="2"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Select.show({
                title: 'Danh mục KKPhim',
                items: [
                    { title: 'Phim Mới Cập Nhật', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
                    { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
                    { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' },
                    { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh' }
                ],
                onSelect: function (sel) {
                    Lampa.Activity.push({ title: sel.title, url: sel.url, component: 'kkphim', page: 1 });
                }
            });
        });

        $('.menu .menu__list').append(menu_item);

        // --- BƯỚC 2: ÉP CSS ĐỂ VUỐT ĐƯỢC TRÊN ANDROID ---
        if (!$('#kkphim-style').length) {
            $('head').append('<style id="kkphim-style">.category-full { min-height: 101vh !important; display: flex; flex-wrap: wrap; }</style>');
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
