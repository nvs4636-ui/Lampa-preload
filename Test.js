(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var body = $('<div class="category-full"></div>');
        
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var page = 1;
        var total_pages = 1;
        var loading = false;
        var self = this;

        this.create = function () {
            // Gắn body vào scroll ngay từ đầu
            scroll.append(body);

            scroll.onEnd = function () {
                if (!loading && page < total_pages) {
                    page++;
                    self.load();
                }
            };

            this.load();
            return scroll.render(); // Trả về trực tiếp render của scroll
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
                loading = false;
                Lampa.Noty.show('Lỗi kết nối KKPhim!');
            });
        };

        this.append = function (data) {
            if (data.length === 0 && page === 1) {
                body.append('<div class="empty">Hết phim rồi ní!</div>');
            }

            data.forEach(function (item) {
                if (!item) return;
                var card = Lampa.Template.get('card', {
                    title: item.name || 'Phim',
                    release_year: item.year || '2025'
                });

                var poster = item.poster_url || item.thumb_url || '';
                card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);

                card.on('click hover:enter', function () {
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
            
            // Cập nhật scroll để hệ thống nhận diện chiều cao mới
            scroll.update();
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

        this.render = function () { return scroll.render(); };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            body.remove();
            items = [];
        };
    }

    function startPlugin() {
        // --- XỬ LÝ TRÙNG LẶP TRIỆT ĐỂ ---
        if (window.kkphim_plugin_loaded) return;
        window.kkphim_plugin_loaded = true;

        // Xóa tất cả các bản cũ đang kẹt trong DOM
        $('.menu__item[data-action="kkphim"]').remove();
        
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3498db"/><path d="M10 8l6 4-6 4V8z" fill="white"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click hover:enter', function () {
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
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
