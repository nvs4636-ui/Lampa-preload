(function () {
    'use strict';

    function startPlugin() {
        // 1. Hàm tìm kiếm và xử lý lấy link
        var startSearch = function (data) {
            var title = data.movie.title || data.movie.name;
            Lampa.Noty.show('Đang tìm: ' + title);

            var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);
            
            $.getJSON(url, function (res) {
                var list = res.data ? res.data.items : [];
                var movie = list.find(function(m) {
                    return m.name.toLowerCase() === title.toLowerCase() || 
                           m.origin_name.toLowerCase() === title.toLowerCase();
                }) || list[0];

                if (movie) {
                    $.getJSON('https://phimapi.com/phim/' + movie.slug, function (detail) {
                        var episodes = detail.episodes[0].server_data;
                        
                        // Nếu là phim bộ (>1 tập), hiện danh sách để chọn
                        if (episodes.length > 1) {
                            Lampa.Select.show({
                                title: 'Chọn tập phim',
                                items: episodes.map(function(e) { 
                                    return { title: e.name, url: e.link_m3u8 }; 
                                }),
                                onSelect: function (item) {
                                    Lampa.Player.play({ url: item.url, title: detail.movie.name + ' - ' + item.title });
                                    Lampa.Player.playlist(episodes.map(e => ({ title: e.name, url: e.link_m3u8 })));
                                }
                            });
                        } else {
                            // Phim lẻ phát luôn
                            Lampa.Player.play({ url: episodes[0].link_m3u8, title: detail.movie.name });
                        }
                    });
                } else {
                    Lampa.Noty.show('Không tìm thấy nguồn trên KKPhim');
                }
            });
        };

        // 2. "Tiêm" nút bấm vào trang chi tiết phim (Full card)
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.render();
                // Tìm vị trí các nút bấm (như Trailer, Favorite...)
                var container = render.find('.full-start__buttons');
                
                // Tạo nút KKPhim theo style chuẩn Lampa
                var btn = $('<div class="full-start__button selector"><span>KKPhim</span></div>');
                
                btn.on('click:select', function () {
                    startSearch(e.data);
                });

                // Chèn nút vào danh sách
                if (container.length) {
                    container.append(btn);
                    // Force để Lampa nhận diện có thêm item mới để di chuyển Remote
                    e.object.context ? e.object.context() : null;
                }
            }
        });

        console.log('KKPhim Plugin: Button Injected');
    }

    // Đợi app sẵn sàng
    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
