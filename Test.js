(function () {
    'use strict';

    var api = 'https://phimapi.com/';
    var img = 'https://phimimg.com/';

    $('.menu__item[data-action="kkphim"]').remove();

    function KKPhim(object) {
        var network = new Lampa.Request();
        var scroll = new Lampa.Scroll({ mask: true });
        var self = this;

        this.create = function () {
            Lampa.Loading.start();

            if (object.url) this.loadGrid(object);
            else this.loadHome();

            return scroll.render();
        };

        /* HOME */
        this.loadHome = function () {
            var cats = [
                { title: 'Phim Mới', url: api + 'danh-sach/phim-moi-cap-nhat' },
                { title: 'Phim Lẻ', url: api + 'v1/api/danh-sach/phim-le' },
                { title: 'Phim Bộ', url: api + 'v1/api/danh-sach/phim-bo' }
            ];

            var i = 0;
            function next() {
                if (i >= cats.length) return self.done();
                self.loadRow(cats[i++], next);
            }
            next();
        };

        this.loadRow = function (cat, cb) {
            var url = cat.url.includes('/v1/')
                ? cat.url + '?page=1&limit=15'
                : cat.url + '?page=1';

            network.silent(url, function (data) {
                var list = data?.data?.items || data?.items || [];
                if (!list.length) return cb();

                var row = Lampa.Template.get('category', {
                    title: cat.title,
                    more: true
                });

                row.find('.category__more').on('click', function () {
                    Lampa.Activity.push({
                        component: 'kkphim',
                        title: cat.title,
                        url: cat.url,
                        page: 1
                    });
                });

                var items = row.find('.category__items');

                list.slice(0, 12).forEach(function (it) {
                    items.append(self.card(it));
                });

                scroll.append(row);
                cb();
            }, cb);
        };

        /* GRID */
        this.loadGrid = function (o) {
            var url = o.url.includes('/v1/')
                ? o.url + '?page=' + (o.page || 1) + '&limit=24'
                : o.url + '?page=' + (o.page || 1);

            network.silent(url, function (data) {
                var list = data?.data?.items || data?.items || [];

                list.forEach(function (it) {
                    scroll.append(self.card(it));
                });

                self.done();
            });
        };

        this.card = function (it) {
            var c = Lampa.Template.get('card', {
                title: it.name,
                release_year: it.year || ''
            });

            var p = it.poster_url || it.thumb_url || '';
            c.find('.card__img').attr('src', p.includes('http') ? p : img + p);

            c.addClass('selector');
            c.on('click', function () {
                self.play(it);
            });

            return c;
        };

        this.play = function (it) {
            network.silent(api + 'phim/' + it.slug, function (d) {
                if (!d?.episodes?.length) return;

                Lampa.Select.show({
                    title: it.name,
                    items: d.episodes[0].server_data.map(function (e) {
                        return { title: 'Tập ' + e.name, url: e.link_m3u8 };
                    }),
                    onSelect: function (p) {
                        Lampa.Player.play({
                            title: p.title,
                            url: p.url
                        });
                    }
                });
            });
        };

        this.done = function () {
            Lampa.Loading.stop();
            setTimeout(function () {
                scroll.update();
                Lampa.Controller.toggle('content');
            }, 100);
        };

        this.destroy = function () {
            network.clear();
            scroll.destroy();
        };
    }

    function start() {
        Lampa.Component.add('kkphim', KKPhim);

        var m = $(`
            <li class="menu__item selector" data-action="kkphim">
                <div class="menu__ico">🎬</div>
                <div class="menu__text">KKPhim</div>
            </li>
        `);

        m.on('click', function () {
            Lampa.Activity.push({ component: 'kkphim', title: 'KKPhim' });
        });

        $('.menu .menu__list').append(m);
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', e => e.type === 'ready' && start());
})();