(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div></div>');
        var active = 0;

        // --- 1. Cấu hình API KKPhim ---
        var api_search = 'https://phimapi.com/v1/api/tim-kiem?keyword=';
        var api_detail = 'https://phimapi.com/phim/';
        var img_proxy = 'https://phimimg.com/';

        this.create = function () {
            var self = this;
            this.start();
            return this.render();
        };

        this.start = function () {
            var query = object.search || object.movie.title;
            var url = api_search + encodeURIComponent(query);

            network.silent(url, function (data) {
                if (data && data.data && data.data.items.length > 0) {
                    items = data.data.items;
                    self.showResults();
                } else {
                    Lampa.Noty.show('KKPhim: Không tìm thấy phim này ní ơi!');
                }
            }, function () {
                Lampa.Noty.show('Lỗi kết nối KKPhim rồi!');
            });
        };

        this.showResults = function () {
            var self = this;
            items.forEach(function (item, index) {
                var card = Lampa.Template.get('button', {title: item.name + ' (' + item.origin_name + ')'});
                card.on('hover:enter', function () {
                    self.getStream(item.slug, item.name);
                });
                html.append(card);
            });
            Lampa.Controller.enable('content');
        };

        // --- 2. Hàm lấy Link Stream (.m3u8) ---
        this.getStream = function (slug, title) {
            Lampa.Loading.show();
            network.silent(api_detail + slug, function (data) {
                Lampa.Loading.hide();
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var episodes = data.episodes[0].server_data;
                    
                    // Nếu chỉ có 1 tập (Phim lẻ)
                    if (episodes.length === 1) {
                        Lampa.Player.play({
                            url: episodes[0].link_m3u8,
                            title: title
                        });
                    } else {
                        // Nếu là phim bộ, hiện danh sách tập
                        var playlist = episodes.map(function(ep) {
                            return {
                                title: 'Tập ' + ep.name,
                                url: ep.link_m3u8
                            };
                        });
                        Lampa.Select.show({
                            title: 'Chọn tập phim',
                            items: playlist,
                            onSelect: function(selected) {
                                Lampa.Player.play(selected);
                            }
                        });
                    }
                }
            });
        };

        this.render = function () {
            return html;
        };
    }

    // --- 3. Đăng ký Plugin vào Menu Lampa ---
    function startPlugin() {
        window.kkphim_plugin = true;
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 7L12 12L3 7L12 2L21 7Z" fill="white"/><path d="M21 17L12 22L3 17" stroke="white" stroke-width="2"/><path d="M21 12L12 17L3 12" stroke="white" stroke-width="2"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: 'KKPhim',
                component: 'kkphim',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') startPlugin();
    });

})();
