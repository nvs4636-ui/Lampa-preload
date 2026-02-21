(function () {
    'use strict';

    function startPlugin() {
        // 1. Đăng ký vào hệ thống Interaction (Để hiện trong mục Online)
        Lampa.Interaction.add({
            label: 'KKPhim',
            id: 'kkphim_provider',
            onSelect: function (object) {
                // Khi bấm vào KKPhim trong danh sách Online
                Lampa.Activity.push({
                    title: 'KKPhim',
                    component: 'kkphim_view',
                    movie: object.movie,
                    page: 1
                });
            }
        });

        // 2. Component hiển thị danh sách tập phim
        Lampa.Component.add('kkphim_view', function (object) {
            var network = new Lampa.Reguest();
            var scroll = new Lampa.Scroll({mask: true, over: true});
            var html = $('<div></div>');
            var body = $('<div class="category-full"></div>');

            this.create = function () {
                var _this = this;
                var title = object.movie.original_title || object.movie.title;
                var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

                Lampa.Noty.show('Đang quét KKPhim...');

                network.silent(url, function (res) {
                    var list = res.data ? res.data.items : [];
                    var movie = list[0]; // Lấy kết quả sát nhất

                    if (movie) {
                        $.getJSON('https://phimapi.com/phim/' + movie.slug, function (data) {
                            body.empty();
                            var server = data.episodes[0].server_data;
                            
                            server.forEach(function (ep) {
                                var btn = Lampa.Template.get('button_category', {title: 'Tập ' + ep.name});
                                btn.on('click:select', function () {
                                    Lampa.Player.play({
                                        url: ep.link_m3u8,
                                        title: data.movie.name + ' - ' + ep.name
                                    });
                                    Lampa.Player.playlist(server.map(e => ({title: 'Tập ' + e.name, url: e.link_m3u8})));
                                });
                                body.append(btn);
                            });
                            _this.check();
                        });
                    } else {
                        body.append('<div class="selector" style="padding: 20px; text-align: center;">Không tìm thấy nguồn</div>');
                    }
                });
                return this.render();
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
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
