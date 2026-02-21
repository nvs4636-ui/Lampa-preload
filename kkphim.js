(function () {
    'use strict';

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [];
        var html = $('<div></div>');
        var body = $('<div class="category-full"></div>');
        var info;

        this.create = function () {
            var _this = this;
            // Hiển thị trạng thái đang tìm kiếm
            var loading = $('<div class="selector" style="padding: 20px; text-align: center;">Đang tìm nguồn KKPhim...</div>');
            body.append(loading);

            var title = object.movie.title || object.movie.name;
            var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

            network.silent(url, function (data) {
                loading.remove();
                var list = data.data ? data.data.items : [];
                var movie = list.find(function(m) {
                    return m.name.toLowerCase() === title.toLowerCase() || 
                           m.origin_name.toLowerCase() === title.toLowerCase();
                }) || list[0];

                if (movie) {
                    _this.getLinks(movie.slug);
                } else {
                    body.append('<div class="selector" style="padding: 20px; text-align: center;">Không tìm thấy phim trên KKPhim</div>');
                }
            });

            return this.render();
        };

        this.getLinks = function (slug) {
            var _this = this;
            fetch('https://phimapi.com/phim/' + slug)
                .then(res => res.json())
                .then(data => {
                    body.empty();
                    var episodes = data.episodes[0].server_data;
                    
                    episodes.forEach(function (ep) {
                        var card = Lampa.Template.get('card', {
                            title: ep.name,
                            img: data.movie.thumb_url
                        });
                        
                        card.addClass('card--small'); // Làm card nhỏ lại giống danh sách tập phim
                        
                        card.on('click:select', function () {
                            Lampa.Player.play({
                                url: ep.link_m3u8,
                                title: data.movie.name + ' - ' + ep.name
                            });
                            var playlist = episodes.map(e => ({ title: e.name, url: e.link_m3u8 }));
                            Lampa.Player.playlist(playlist);
                        });

                        body.append(card);
                    });
                });
        };

        this.render = function () { return html.append(body); };
        this.destroy = function () { network.clear(); scroll.destroy(); html.remove(); };
    }

    function startPlugin() {
        // Đăng ký nút "KKPhim" vào menu tương tác của phim (Interaction)
        Lampa.Interaction.add({
            label: 'KKPhim',
            id: 'kkphim_source',
            onSelect: function (object) {
                // Khi bấm vào nút, đẩy một Activity mới hiện danh sách tập
                Lampa.Activity.push({
                    title: 'KKPhim',
                    component: 'kkphim_component',
                    movie: object.movie,
                    page: 1
                });
            }
        });

        // Đăng ký Component để hiển thị danh sách tập
        Lampa.Component.add('kkphim_component', KKPhim);
        
        console.log('KKPhim Plugin Integrated');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
