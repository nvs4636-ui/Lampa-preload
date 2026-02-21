(function () {
    'use strict';

    function startPlugin() {
        // 1. Đăng ký KKPhim vào danh sách bộ lọc nguồn (Parser)
        Lampa.Component.add('kkphim_mod', function (object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({mask: true, over: true});
            var items = [];
            var html = $('<div></div>');
            var body = $('<div class="category-full"></div>');

            this.create = function () {
                var _this = this;
                var title = object.movie.title || object.movie.name;
                var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

                network.silent(url, function (res) {
                    var list = res.data ? res.data.items : [];
                    if (list.length > 0) {
                        _this.showEpisodes(list[0].slug);
                    } else {
                        body.append('<div class="selector" style="padding: 20px; text-align: center;">Không tìm thấy phim trên KKPhim</div>');
                    }
                });
                return this.render();
            };

            this.showEpisodes = function (slug) {
                var _this = this;
                $.getJSON('https://phimapi.com/phim/' + slug, function (data) {
                    body.empty();
                    var server = data.episodes[0].server_data;
                    server.forEach(function (ep) {
                        var item = Lampa.Template.get('button_category', {title: 'Tập ' + ep.name});
                        item.on('click:select', function () {
                            Lampa.Player.play({
                                url: ep.link_m3u8,
                                title: data.movie.name + ' - Tập ' + ep.name
                            });
                            Lampa.Player.playlist(server.map(e => ({title: 'Tập ' + e.name, url: e.link_m3u8})));
                        });
                        body.append(item);
                    });
                    // Refresh lại selector để điều khiển TV hoạt động
                    _this.check();
                });
            };

            this.check = function() {
                Lampa.Controller.add('content', {
                    toggle: function() {
                        Lampa.Controller.collectionSet(html);
                        Lampa.Controller.toggle('content');
                    },
                    left: function() { Lampa.Controller.toggle('menu'); },
                    up: function() { Lampa.Controller.toggle('head'); }
                });
                Lampa.Controller.toggle('content');
            };

            this.render = function () { return html.append(body); };
            this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); };
        });

        // 2. CHÈN VÀO MỤC SOURCE (Đây là phần giúp hiện menu như Online Mod)
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var btn = $('<div class="full-start__button selector"><span>KKPhim Online</span></div>');
                
                btn.on('click:select', function () {
                    Lampa.Activity.push({
                        title: 'KKPhim',
                        component: 'kkphim_mod',
                        movie: e.data,
                        page: 1
                    });
                });

                // Chèn vào đúng chỗ mà Shots và Trailers đang đứng
                e.object.render().find('.full-start__buttons').append(btn);
            }
        });
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
