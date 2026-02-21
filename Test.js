(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var items = [];
        var html = $('<div></div>'); 
        var body = $('<div class="category-full"></div>'); // Vùng chứa phim chuẩn lưới
        
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var page = 1;
        var total_pages = 1;
        var loading = false;
        var self = this;

        // 1. Tạo giao diện
        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);

            // Cuộn xuống cuối tự load trang tiếp theo
            scroll.onEnd = function () {
                if (!loading && page < total_pages) {
                    page++;
                    self.load();
                }
            };

            this.load();
            return this.render();
        };

        // 2. Tải dữ liệu
        this.load = function () {
            loading = true;
            
            // Hiện loading xịn của hệ thống Lampa (chỉ trang 1)
            if (page === 1 && this.activity) {
                this.activity.loader(true); 
            }

            var query = object.search || (object.movie && object.movie.title) || '';
            var url = '';

            if (query) {
                url = api_host + 'v1/api/tim-kiem?keyword=' + encodeURIComponent(query) + '&page=' + page;
            } else {
                url = (object.url || api_host + 'danh-sach/phim-moi-cap-nhat');
                url += (url.includes('?') ? '&' : '?') + 'page=' + page;
            }

            network.silent(url, function (data) {
                var raw_items = (data.data && data.data.items) ? data.data.items : (data.items || []);
                
                var pagination = (data.data && data.data.params && data.data.params.pagination) ? data.data.params.pagination : (data.params && data.params.pagination ? data.params.pagination : null);
                if (pagination) {
                    total_pages = Math.ceil(pagination.totalItems / pagination.totalItemsPerPage);
                }

                self.append(raw_items);
                loading = false;
            }, function () {
                self.empty('Lỗi kết nối KKPhim!');
                loading = false;
            });
        };

        // 3. Đổ phim vào màn hình
        this.append = function (data) {
            if (data.length === 0 && page === 1) {
                this.empty('Không tìm thấy phim rồi ní ơi!');
                return;
            }

            data.forEach(function (item) {
                if (!item) return;

                var card = Lampa.Template.get('card', {
                    title: item.name || 'Không rõ tên',
                    release_year: item.year || '2025'
                });

                var poster = item.poster_url || item.thumb_url || '';
                var img = poster ? (poster.includes('http') ? poster : img_proxy + poster) : '';
                card.find('.card__img').attr('src', img);

                card.on('hover:enter', function () {
                    self.getStream(item.slug, item.name);
                });

                card.addClass('selector');
                body.append(card);
                items.push(card);
            });

            // Tắt Loading gốc của hệ thống và đánh thức Controller
            if (this.activity) {
                this.activity.loader(false);
                this.activity.toggle(); 
            }

            // Sửa triệt để lỗi getBoundingClientRect: Dùng Try Catch bảo vệ
            if (items.length > 0) {
                try { scroll.update(); } catch(e) {}
            }
        };

        this.empty = function (msg) {
            body.append('<div class="empty">' + msg + '</div>');
            if (this.activity) {
                this.activity.loader(false);
                this.activity.toggle();
            }
        };

        // 4. Kích hoạt điều khiển (Hàm bắt buộc của hệ thống)
        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left: function () {
                    if (Lampa.Controller.collectionSet(scroll.render())) {
                        Lampa.Controller.collectionFocus(false, scroll.render());
                    }
                },
                right: function () {},
                up: function () { Lampa.Select.show(); },
                down: function () {},
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        // Hàm phát phim
        this.getStream = function (slug, title) {
            if (window.Lampa && Lampa.Loading && typeof Lampa.Loading.active === 'function') {
                try { Lampa.Loading.active(true); } catch(e){}
            }

            network.silent(api_host + 'phim/' + slug, function (data) {
                if (window.Lampa && Lampa.Loading && typeof Lampa.Loading.active === 'function') {
                    try { Lampa.Loading.active(false); } catch(e){}
                }
                
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
                } else {
                    Lampa.Noty.show('Chưa có tập phim!');
                }
            });
        };

        // Các hàm vòng đời để Lampa quản lý RAM
        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return html; };
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            html.remove();
            body.remove();
            items = [];
        };
    }

    function startPlugin() {
        if ($('.menu__item[data-action="kkphim"]').length > 0) return;
        Lampa.Component.add('kkphim', KKPhim);

        var menu_list = [
            { title: 'Phim Mới Cập Nhật', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh' }
        ];

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 12L3 7L12 2L21 7Z" fill="#2ecc71"/><path d="M21 17L12 22L3 17" stroke="#2ecc71" stroke-width="2"/><path d="M21 12L12 17L3 12" stroke="#2ecc71" stroke-width="2"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Select.show({
                title: 'Danh mục KKPhim',
                items: menu_list,
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
