(function () {
    'use strict';

    // 1. DỌN DẸP SẠCH SẼ CŨ
    $('.menu__item[data-action="kkphim"]').remove();
    $('#kk-style-lnum').remove();

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var body = $('<div class="kk-lnum-home"></div>');
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self = this;

        this.create = function () {
            if (!object.url) {
                this.buildHome();
            } else {
                this.loadCategory(object.url, object.title);
            }
            return scroll.render();
        };

        this.buildHome = function () {
            var categories = [
                { title: 'Phim Mới Cập Nhật', url: api_host + 'danh-sach/phim-moi-cap-nhat' },
                { title: 'Phim Lẻ', url: api_host + 'v1/api/danh-sach/phim-le' },
                { title: 'Phim Bộ', url: api_host + 'v1/api/danh-sach/phim-bo' }
            ];

            categories.forEach(function (cat) {
                var row = $(`
                    <div class="kk-row">
                        <div class="kk-row__header">
                            <div class="kk-row__title">${cat.title}</div>
                            <div class="kk-row__more selector">Xem thêm</div>
                        </div>
                        <div class="kk-row__content selector"></div>
                    </div>
                `);
                
                row.find('.kk-row__more').on('click', function() {
                    Lampa.Activity.push({ title: cat.title, url: cat.url, component: 'kkphim', page: 1 });
                });

                body.append(row);
                
                network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                    var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                    var content = row.find('.kk-row__content');
                    
                    list.slice(0, 10).forEach(function (item) {
                        var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                        var poster = item.poster_url || item.thumb_url || '';
                        card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                        card.addClass('selector');
                        card.on('click', function (e) { 
                            e.stopPropagation();
                            self.getStream(item.slug, item.name); 
                        });
                        content.append(card);
                    });
                    // Quan trọng: Chỉ update scroll khi đã có nội dung để tránh lỗi getBoundingClientRect
                    setTimeout(function() { scroll.update(); }, 200);
                });
            });
            scroll.append(body);
        };

        this.loadCategory = function (url, title) {
            var grid = $('<div class="category-full"></div>');
            network.silent(url + (url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                list.forEach(function (item) {
                    var card = Lampa.Template.get('card', { title: item.name, release_year: item.year });
                    var poster = item.poster_url || item.thumb_url || '';
                    card.find('.card__img').attr('src', poster.includes('http') ? poster : img_proxy + poster);
                    card.addClass('selector');
                    card.on('click', function () { self.getStream(item.slug, item.name); });
                    grid.append(card);
                });
                scroll.append(grid);
                scroll.update();
            });
        };

        this.getStream = function (slug, title) {
            Lampa.Noty.show('Đang tải tập phim...');
            network.silent(api_host + 'phim/' + slug, function (data) {
                if (data && data.episodes && data.episodes[0].server_data.length > 0) {
                    var server = data.episodes[0].server_data;
                    Lampa.Select.show({
                        title: title,
                        items: server.map(function(ep) { return { title: 'Tập ' + ep.name, url: ep.link_m3u8 }; }),
                        onSelect: function(selected) { Lampa.Player.play(selected); }
                    });
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                up: function () { Lampa.Select.show(); },
                back: function () { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('content');
        };

        this.render = function () { return scroll.render(); };
        this.destroy = function () { network.clear(); scroll.destroy(); body.remove(); };
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="#e74c3c"><path d="M21 7L12 12L3 7L12 2L21 7ZM21 17L12 22L3 17M21 12L12 17L3 12" stroke="#fff" stroke-width="1"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click', function () {
            Lampa.Activity.push({ title: 'KKPhim Home', component: 'kkphim', page: 1 });
        });

        $('.menu .menu__list').append(menu_item);

        // 2. CSS ÉP CHẾ ĐỘ "SOLID" GIỐNG LNUM
        if (!$('#kk-style-lnum').length) {
            $('head').append(`<style id="kk-style-lnum">
                /* Fix thanh bar dưới: Đen đặc, không trong suốt */
                .bar { background: #0a0a0a !important; opacity: 1 !important; height: 70px !important; display: flex !important; }
                .bar__item { opacity: 1 !important; }

                /* Nền tổng thể trang chủ */
                .kk-lnum-home { padding: 20px 0 100px 0; background: #141414; min-height: 100vh; }
                
                /* Hàng phim chuẩn LNUM */
                .kk-row { margin-bottom: 35px; }
                .kk-row__header { display: flex; align-items: center; padding: 0 20px 10px 20px; }
                .kk-row__title { font-size: 1.7rem; font-weight: bold; color: #fff; flex-grow: 1; text-transform: uppercase; letter-spacing: 1px; }
                .kk-row__more { background: rgba(255,255,255,0.1); color: #ccc; padding: 4px 12px; border-radius: 4px; font-size: 1rem; transition: all 0.2s; }
                .kk-row__more.focus { background: #fff; color: #000; }
                
                /* Cuộn ngang mượt mà */
                .kk-row__content { 
                    display: flex; 
                    overflow-x: auto; 
                    padding: 10px 20px; 
                    gap: 15px; 
                    -webkit-overflow-scrolling: touch; 
                }
                .kk-row__content::-webkit-scrollbar { display: none; }
                
                /* Kích thước Card giống ảnh LNUM ní gửi */
                .kk-row__content .card { flex: 0 0 145px; width: 145px; border: none !important; }
                .kk-row__content .card__img { border-radius: 6px; }
                .kk-row__content .card__title { font-size: 1rem !important; color: #fff; margin-top: 5px; height: 2.4em; overflow: hidden; }

                /* Fix lỗi văng xanh: Đảm bảo vùng chứa luôn có kích thước */
                .category-full { display: flex; flex-wrap: wrap; padding: 20px; gap: 15px; min-height: 500px; }
            </style>`);
        }
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
