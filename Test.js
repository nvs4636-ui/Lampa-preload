(function () {
    'use strict';

    // --- BƯỚC 1: QUÉT SẠCH RÁC CŨ ---
    $('.menu__item[data-action="kkphim"]').remove();
    $('[id^="kk-style"]').remove(); // Xóa tất cả các style có tên bắt đầu bằng kk-style
    window.kkphim_inited = false; 

    function KKPhim(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true, step: 250});
        var body = $('<div class="kk-lnum-wrapper"></div>');
        var api_host = 'https://phimapi.com/';
        var img_proxy = 'https://phimimg.com/';
        var self = this;

        this.create = function () {
            if (!object.url) {
                this.buildHome();
            } else {
                this.loadCategory(object.url);
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
                    <div class="kk-lnum-row">
                        <div class="kk-lnum-header">
                            <div class="kk-lnum-title">${cat.title}</div>
                            <div class="kk-lnum-more selector">More</div>
                        </div>
                        <div class="kk-lnum-content selector"></div>
                    </div>
                `);
                
                row.find('.kk-lnum-more').on('click', function() {
                    Lampa.Activity.push({ title: cat.title, url: cat.url, component: 'kkphim', page: 1 });
                });

                body.append(row);
                
                network.silent(cat.url + (cat.url.includes('?') ? '&' : '?') + 'page=1', function (data) {
                    var list = (data.data && data.data.items) ? data.data.items : (data.items || []);
                    var content = row.find('.kk-lnum-content');
                    
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
                    setTimeout(function() { scroll.update(); }, 300);
                });
            });
            scroll.append(body);
        };

        this.loadCategory = function (url) {
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
            Lampa.Noty.show('Đang lấy link...');
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

    // --- BƯỚC 2: CSS ÉP CHẾ ĐỘ SOLID (GIỐNG ẢNH LNUM MẪU) ---
    function addStyle() {
        if ($('#kk-style-final').length) return;
        $('head').append(`<style id="kk-style-final">
            /* Ép thanh bar dưới màu đen đặc, không trong suốt */
            .bar { background: #000000 !important; opacity: 1 !important; border-top: 1px solid #222; }
            .bar__item { opacity: 1 !important; }

            /* Bố cục Home chuẩn LNUM */
            .kk-lnum-wrapper { padding: 10px 0 100px 0; background: #141414; }
            .kk-lnum-row { margin-bottom: 30px; }
            .kk-lnum-header { display: flex; align-items: center; padding: 0 15px 8px; }
            .kk-lnum-title { font-size: 1.6rem; font-weight: 700; color: #fff; flex-grow: 1; text-shadow: 1px 1px 2px #000; }
            .kk-lnum-more { background: rgba(255,255,255,0.15); color: #fff; padding: 3px 12px; border-radius: 15px; font-size: 0.9rem; text-transform: uppercase; }
            .kk-lnum-more.focus { background: #fff; color: #000; }

            /* Cuộn ngang mượt cho Android Touch */
            .kk-lnum-content { 
                display: flex; 
                overflow-x: auto; 
                padding: 5px 15px; 
                gap: 12px; 
                -webkit-overflow-scrolling: touch; 
            }
            .kk-lnum-content::-webkit-scrollbar { display: none; }
            
            /* Card phim đẹp hơn */
            .kk-lnum-content .card { flex: 0 0 140px; width: 140px; border: none !important; background: transparent !important; }
            .kk-lnum-content .card__img { border-radius: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); }
            .kk-lnum-content .card__title { font-size: 0.95rem !important; margin-top: 6px; line-height: 1.2; }
            
            /* Fix lỗi văng màn hình xanh */
            .category-full { display: flex; flex-wrap: wrap; padding: 15px; gap: 10px; min-height: 100vh; }
        </style>`);
    }

    function startPlugin() {
        Lampa.Component.add('kkphim', KKPhim);
        addStyle();

        var menu_item = $('<li class="menu__item selector" data-action="kkphim">' +
            '<div class="menu__ico"><svg width="36" height="36" viewBox="0 0 24 24" fill="#e74c3c"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg></div>' +
            '<div class="menu__text">KKPhim</div>' +
            '</li>');

        menu_item.on('click', function () {
            Lampa.Activity.push({ title: 'KKPhim', component: 'kkphim', page: 1 });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
