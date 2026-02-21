(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div class="category-full"></div>');

        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';

        // Hàm hiện loading an toàn
        function showLoading() {
            if (window.Lampa && Lampa.Loading && typeof Lampa.Loading.show === 'function') {
                Lampa.Loading.show();
            }
        }

        function hideLoading() {
            if (window.Lampa && Lampa.Loading && typeof Lampa.Loading.hide === 'function') {
                Lampa.Loading.hide();
            }
        }

        this.create = function () {
            this.start();
            return this.render();
        };

        this.start = function () {
            var self = this;
            var page = object.page || 1;
            var query = object.search || (object.movie && object.movie.title) || '';
            var url = '';

            if (query) {
                url = api_host + 'v1/api/tim-kiem?keyword=' + encodeURIComponent(query) + '&page=' + page;
            } else {
                url = (object.url || api_host + 'danh-sach/phim-moi-cap-nhat');
                url += (url.includes('?') ? '&' : '?') + 'page=' + page;
            }

            showLoading();
            network.silent(url, function (data) {
                hideLoading();
                var raw_items = (data.data && data.data.items) ? data.data.items : (data.items || []);
                
                if (raw_items.length > 0) {
                    if (page === 1) html.empty();
                    self.display(raw_items);
                } else {
                    Lampa.Noty.show('Danh mục này hiện chưa có phim ní ơi!');
                }
            }, function () {
                hideLoading();
                Lampa.Noty.show('Lỗi kết nối KKPhim!');
            });
        };

        this.display = function (data) {
            var self = this;
            data.forEach(function (item) {
                var card = Lampa.Template.get('card', {
                    title: item.name,
                    release_year: item.year || '2024'
                });
                
                // Fix poster không hiện
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
            showLoading();
            network.silent(api_host + 'phim/' + slug, function (data) {
                hideLoading();
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
        // 1. Kiểm tra chống trùng lặp menu (Dùng ID riêng)
        if ($('.menu__item[data-action="kkphim"]').length > 0) return;

        Lampa.Component.add('kkphim', KKPhim);

        var menu_list = [
            { title: 'Phim Mới Cập Nhật', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
            { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
            { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' },
            { title: 'Hoạt Hình', url: 'https://phimapi.com/v1/api/danh-sach/hoat-hinh' }
        ];

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 12L3 7L12 2L21 7Z" fill="#e74c3c"/><path d="M21 17L12 22L3 17" stroke="#e74c3c" stroke-width="2"/><path d="M21 12L12 17L3 12" stroke="#e74c3c" stroke-width="2"/></svg></div>' +
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

        // 2. Chèn vào cuối danh sách menu
        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
