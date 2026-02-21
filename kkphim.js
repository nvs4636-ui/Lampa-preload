(function () {
    'use strict';

    function startPlugin() {
        // 1. Đăng ký Component xử lý tìm kiếm
        Lampa.Component.add('kkphim_worker', function(object) {
            this.create = function() {
                var title = object.movie.title || object.movie.name;
                var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);
                
                Lampa.Noty.show('Đang tìm: ' + title);
                
                $.getJSON(url, function(res) {
                    var list = res.data ? res.data.items : [];
                    var movie = list[0]; // Lấy kết quả đầu tiên

                    if (movie) {
                        $.getJSON('https://phimapi.com/phim/' + movie.slug, function(detail) {
                            var eps = detail.episodes[0].server_data;
                            Lampa.Select.show({
                                title: detail.movie.name,
                                items: eps.map(e => ({ title: e.name, url: e.link_m3u8 })),
                                onSelect: function(item) {
                                    Lampa.Player.play({ url: item.url, title: detail.movie.name + ' - ' + item.title });
                                    Lampa.Player.playlist(eps.map(e => ({ title: e.name, url: e.link_m3u8 })));
                                }
                            });
                        });
                    } else {
                        Lampa.Noty.show('Không tìm thấy trên KKPhim');
                    }
                });
                return $('<div></div>');
            };
            this.render = function() { return this.create(); };
            this.destroy = function() {};
        });

        // 2. ÉP BUỘC HIỂN THỊ NÚT (Sửa lỗi bạn đang gặp)
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.render();
                
                // Tìm vùng chứa các mục Source (như Trailers trong ảnh của bạn)
                var sourceList = render.find('.full-start__sources, .full-start__buttons');
                
                // Tạo một item mới giống hệt mục Trailers/Shots
                var kkItem = $(`
                    <div class="full-start__button selector button--kkphim">
                        <svg height="24" viewBox="0 0 24 24" width="24" style="margin-right: 10px;"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>
                        <span>KKPhim Online</span>
                    </div>
                `);

                kkItem.on('click:select', function () {
                    Lampa.Component.add('kkphim_worker', {movie: e.data}); // Kích hoạt tìm kiếm
                    Lampa.Activity.push({ component: 'kkphim_worker', movie: e.data });
                });

                // Chèn vào đầu danh sách nút
                if (sourceList.length) {
                    sourceList.prepend(kkItem);
                } else {
                    // Nếu không thấy class cũ, tìm theo cấu trúc mới của bản Mod
                    render.find('.full-start__left').append(kkItem);
                }
            }
        });

        // Thêm CSS để nút nhìn chuyên nghiệp
        $('body').append('<style>.button--kkphim{ display: flex; align-items: center; background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 10px; margin-bottom: 10px; cursor: pointer; } .button--kkphim:hover{ background: rgba(255,255,255,0.2); } .button--kkphim span{ font-size: 1.2em; font-weight: bold; }</style>');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
