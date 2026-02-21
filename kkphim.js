(function () {
    'use strict';

    function KKPhimPlugin(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({mask: true, over: true});
        var items   = [];
        var html    = $('<div></div>');
        var body    = $('<div class="category-full"></div>');
        var currentPage = 1;

        this.create = function () {
            var _this = this;
            if (!object.url && !object.search) {
                return this.renderCategories();
            }
            this.loadNextPage();
            return this.render();
        };

        this.loadNextPage = function () {
            var _this = this;
            var apiUrl = object.url || 'https://phimapi.com/danh-sach/phim-moi-cap-nhat';
            if (object.search) apiUrl = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(object.search);
            
            var finalUrl = apiUrl + (apiUrl.indexOf('?') > -1 ? '&' : '?') + 'page=' + currentPage;

            network.silent(finalUrl, function (data) {
                var list = data.items || (data.data ? data.data.items : []);
                if (list && list.length) {
                    list.forEach(function (item) {
                        var card = Lampa.Template.get('card', {
                            title: item.name,
                            img: (item.thumb_url.indexOf('http') > -1 ? '' : 'https://phimimg.com/') + item.thumb_url
                        });
                        card.on('click:select', function () {
                            _this.playMovie(item.slug);
                        });
                        body.append(card);
                        items.push(card);
                    });
                    currentPage++;
                }
            });
        };

        this.renderCategories = function () {
            var _this = this;
            var cat_html = $('<div class="category-full"></div>');
            var categories = [
                { title: 'Phim Mới', url: 'https://phimapi.com/danh-sach/phim-moi-cap-nhat' },
                { title: 'Phim Lẻ', url: 'https://phimapi.com/v1/api/danh-sach/phim-le' },
                { title: 'Phim Bộ', url: 'https://phimapi.com/v1/api/danh-sach/phim-bo' }
            ];
            categories.forEach(function (cat) {
                var item = $('<div class="selector item_menu" style="margin:1%;padding:20px;background:rgba(255,255,255,0.1);width:46%;float:left;text-align:center;">' + cat.title + '</div>');
                item.on('click:select', function () {
                    Lampa.Activity.push({ title: cat.title, component: 'kkphim', url: cat.url });
                });
                cat_html.append(item);
            });
            return cat_html;
        };

        this.playMovie = function(slug){
            fetch('https://phimapi.com/phim/' + slug).then(function(res){ return res.json(); }).then(function(data){
                var episodes = data.episodes[0].server_data;
                Lampa.Player.play({ url: episodes[0].link_m3u8, title: data.movie.name });
                Lampa.Player.playlist(episodes.map(function(e){ return { title: e.name, url: e.link_m3u8 }; }));
            });
        };

        this.render = function () { return html.append(body); };
        this.destroy = function () { network.clear(); html.remove(); };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhimPlugin);
        Lampa.Menu.add({
            title: 'KKPhim',
            component: 'kkphim',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" fill="white"/></svg>'
        });
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
