(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>'); // Thêm class để hiển thị dạng lưới

        // --- 1. Cấu hình API KKPhim ---
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';

        this.create = function () {
            this.start();
            return this.render();
        };

        this.start = function () {
            var self = this;
            var page = object.page || 1;
            
            // Fix lỗi 'title' bằng cách kiểm tra object.movie trước
            var query = object.search || (object.movie && object.movie.title) || '';
            var url = '';

            // Xác định URL: Nếu có search thì tìm, không thì lấy theo danh mục (url) truyền từ menu
            if (query) {
                url = api_host + 'v1/api/tim-kiem?keyword=' + encodeURIComponent(query) + '&page=' + page;
            } else {
                url = (object.url || api_host + 'danh-sach/phim-moi-cap-nhat?page=') + page;
            }

            Lampa.Loading.show();
            network.silent(url, function (data) {
                Lampa.Loading.hide();
                // Xử lý dữ liệu linh hoạt cho cả 2 loại API của KKPhim
                var raw_items = (data.data && data.data.items) ? data.data.items : (data.items || []);
                
                if (raw_items.length > 0) {
                    if (page === 1) html.empty();
                    self.display(raw_items);
                } else {
                    Lampa.Noty.show('Không tìm thấy nội dung ní ơi!');
                }
            }, function () {
                Lampa.Loading.hide();
                Lampa.Noty.show('Lỗi kết nối API KKPhim!');
            });
        };

        this.display = function (data) {
            var self = this;
            data.forEach(function (item) {
                // Tạo Card phim thay vì Button để có ảnh Poster
                var card = Lampa.Template.get('card', {
                    title: item.name,
                    release_year: item.year || 'N/A'
                });

                var img = item.poster_url.includes('http') ? item.poster_url : img_proxy + item.poster_url;
                card.find('.card__img').attr('src', img);

                card.on('hover:enter', function () {
                    self.getStream(item.slug, item.name);
                });

                html.append(card);
            });
            Lampa.Controller.enable('content');
        };

        this.getStream = function (slug, title) {
            Lampa.Loading.show();
            network.silent(api_host + 'phim/' + slug, function (data) {
                Lampa.Loading.hide();
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var episodes = data.episodes[0].server_data;
                    if (episodes.length === 1) {
                        Lampa.Player.play({ url: episodes[0].link_m3u8, title: title });
                    } else {
                        var playlist = episodes.map(function(ep) {
                            return { title: 'Tập ' + ep.name, url: ep.link_m3u8 };
                        });
                        Lampa.Select.show({
                            title: 'Chọn tập phim',
                            items: playlist,
                            onSelect: function(selected) { Lampa.Player.play(selected); }
                        });
                    }
                }
            });
        };

        this.render = function () { return html; };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        // Tạo danh sách menu con
        var menu_list = [
            { title: 'Phim Mới', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat?page=' },
            { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le?page=' },
            { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo?page=' },
            { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh?page=' }
        ];

        // Đăng ký menu chính KKPhim
        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 12L3 7L12 2L21 7Z" fill="#3498db"/><path d="M21 17L12 22L3 17" stroke="#3498db" stroke-width="2"/><path d="M21 12L12 17L3 12" stroke="#3498db" stroke-width="2"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            // Khi nhấn vào KKPhim, hiện danh sách danh mục để chọn
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
