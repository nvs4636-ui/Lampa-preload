(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>'); // Container dạng lưới
        
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var page = 1;
        var total_pages = 1;
        var loading = false;

        // --- Hàm quản lý Loading an toàn ---
        function toggleLoading(active) {
            if (window.Lampa && Lampa.Loading) {
                if (typeof Lampa.Loading.active === 'function') Lampa.Loading.active(active);
                else if (active && typeof Lampa.Loading.show === 'function') Lampa.Loading.show();
                else if (!active && typeof Lampa.Loading.hide === 'function') Lampa.Loading.hide();
            }
        }

        this.create = function () {
            var self = this;

            // Cơ chế cuộn vô tận giống lnum
            scroll.onEnd = function () {
                if (!loading && page < total_pages) {
                    page++;
                    self.start();
                }
            };

            this.start();
            return scroll.render(); // Trả về scroll để Lampa quản lý Activity
        };

        this.start = function () {
            var self = this;
            if (loading) return;
            loading = true;
            
            var query = object.search || (object.movie && object.movie.title) || '';
            var url = '';

            if (query) {
                url = api_host + 'v1/api/tim-kiem?keyword=' + encodeURIComponent(query) + '&page=' + page;
            } else {
                url = (object.url || api_host + 'danh-sach/phim-moi-cap-nhat');
                url += (url.includes('?') ? '&' : '?') + 'page=' + page;
            }

            toggleLoading(true);

            network.silent(url, function (data) {
                toggleLoading(false);
                var raw_items = (data.data && data.data.items) ? data.data.items : (data.items || []);
                
                // Tính toán tổng số trang từ API KKPhim
                var pagination = (data.data && data.data.params && data.data.params.pagination) ? data.data.params.pagination : (data.params && data.params.pagination ? data.params.pagination : null);
                if (pagination) {
                    total_pages = Math.ceil(pagination.totalItems / pagination.totalItemsPerPage);
                }

                if (raw_items && raw_items.length > 0) {
                    self.display(raw_items);
                } else if (page === 1) {
                    html.append('<div class="empty">Không tìm thấy phim rồi ní ơi!</div>');
                }
                loading = false;
            }, function () {
                toggleLoading(false);
                Lampa.Noty.show('Lỗi kết nối KKPhim!');
                loading = false;
            });
        };

        this.display = function (data) {
            var self = this;
            
            data.forEach(function (item) {
                if (!item) return;

                var card = Lampa.Template.get('card', {
                    title: item.name || 'Phim mới',
                    release_year: item.year || '2025'
                });

                // Xử lý Poster bảo mật
                var poster = item.poster_url || item.thumb_url || '';
                var img = poster ? (poster.includes('http') ? poster : img_proxy + poster) : '';
                card.find('.card__img').attr('src', img);

                card.on('hover:enter', function () {
                    self.getStream(item.slug, item.name);
                });

                card.addClass('selector');
                html.append(card);
            });

            // Gắn container vào bộ cuộn
            scroll.append(html);

            // Fix lỗi getBoundingClientRect: Đợi DOM render xong mới update scroll
            setTimeout(function() {
                scroll.update();
            }, 200);

            this.enableController();
        };

        this.enableController = function () {
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
            Lampa.Controller.enable('content');
        };

        this.getStream = function (slug, title) {
            toggleLoading(true);
            network.silent(api_host + 'phim/' + slug, function (data) {
                toggleLoading(false);
                if (data && data.episodes && data.episodes.length > 0) {
                    var server = data.episodes[0].server_data;
                    if (server && server.length > 0) {
                        if (server.length === 1) {
                            Lampa.Player.play({ url: server[0].link_m3u8, title: title });
                        } else {
                            var playlist = server.map(function(ep) {
                                return { title: 'Tập ' + ep.name, url: ep.link_m3u8 };
                            });
                            Lampa.Select.show({
                                title: 'Chọn tập phim',
                                items: playlist,
                                onSelect: function(selected) { Lampa.Player.play(selected); }
                            });
                        }
                    }
                }
            });
        };

        this.render = function () { return scroll.render(); };
    }

    function startPlugin() {
        // Chặn trùng lặp menu
        if ($('.menu__item[data-action="kkphim"]').length > 0) return;
        
        Lampa.Component.add('kkphim', KKPhim);

        var menu_list = [
            { title: 'Phim Mới Cập Nhật', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh' }
        ];

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 12L3 7L12 2L21 7Z" fill="#3498db"/><path d="M21 17L12 22L3 17" stroke="#3498db" stroke-width="2"/><path d="M21 12L12 17L3 12" stroke="#3498db" stroke-width="2"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Select.show({
                title: 'Danh mục KKPhim',
                items: menu_list,
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
