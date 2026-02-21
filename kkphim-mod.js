(function () {
    'use strict';

    function startKK() {
        // 1. Luôn ưu tiên đăng ký vào mục Interaction (Nút bấm trong Online)
        Lampa.Interaction.add({
            label: 'KKPhim (Nguồn VN)',
            id: 'kkphim_standalone',
            onSelect: function (object) {
                Lampa.Activity.push({
                    title: 'KKPhim',
                    component: 'kkphim_view',
                    movie: object.movie
                });
            }
        });

        // 2. Tự tạo một không gian riêng trong danh sách Player Search
        Lampa.Listener.follow('player:search', function (e) {
            var title = e.movie.original_title || e.movie.title;
            var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

            $.ajax({
                url: url,
                method: 'GET',
                success: function (res) {
                    if (res.data && res.data.items[0]) {
                        e.callback([{
                            name: 'KKPhim 🇻🇳',
                            method: function (call) {
                                $.getJSON('https://phimapi.com/phim/' + res.data.items[0].slug, function (d) {
                                    call(d.episodes[0].server_data.map(ep => ({
                                        title: 'Tập ' + ep.name,
                                        url: ep.link_m3u8
                                    })));
                                });
                            }
                        }]);
                    }
                }
            });
        });

        // 3. Component hiển thị tập phim chuẩn Lampa
        Lampa.Component.add('kkphim_view', function (object) {
            var html = $('<div></div>');
            var body = $('<div class="category-full"></div>');
            this.create = function () {
                var t = object.movie.title || object.movie.name;
                $.getJSON('https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(t), function(res) {
                    if (res.data && res.data.items[0]) {
                        $.getJSON('https://phimapi.com/phim/' + res.data.items[0].slug, function(d) {
                            body.empty();
                            d.episodes[0].server_data.forEach(ep => {
                                var btn = Lampa.Template.get('button_category', { title: 'Tập ' + ep.name });
                                btn.on('click:select', function () {
                                    Lampa.Player.play({ url: ep.link_m3u8, title: d.movie.name + ' - ' + ep.name });
                                });
                                body.append(btn);
                            });
                        });
                    }
                });
                return html.append(body);
            };
            this.render = function () { return html; };
            this.destroy = function () { html.remove(); };
        });
    }

    if (window.app_ready) startKK();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startKK(); });
})();
