(function () {
    'use strict';

    var KKPhimSource = function () {
        // Hàm thực hiện tìm kiếm và phát phim
        this.search = function (object) {
            var title = object.movie.title || object.movie.name;
            Lampa.Noty.show('Đang tìm nguồn cho: ' + title);

            // Sử dụng đúng cấu trúc bạn vừa test thành công
            var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

            $.getJSON(url, function (res) {
                var list = res.data ? res.data.items : [];
                // Tìm phim (ưu tiên tên gốc hoặc tên tiếng Việt)
                var movie = list.find(function(m) {
                    return m.name.toLowerCase() === title.toLowerCase() || 
                           m.origin_name.toLowerCase() === title.toLowerCase();
                }) || list[0];

                if (movie) {
                    $.getJSON('https://phimapi.com/phim/' + movie.slug, function (detail) {
                        var episodes = detail.episodes[0].server_data;
                        
                        if (episodes.length > 1) {
                            // Hiện danh sách tập nếu là phim bộ
                            Lampa.Select.show({
                                title: detail.movie.name,
                                items: episodes.map(function(e) { 
                                    return { title: e.name, url: e.link_m3u8 }; 
                                }),
                                onSelect: function (item) {
                                    Lampa.Player.play({ url: item.url, title: detail.movie.name + ' - ' + item.title });
                                    Lampa.Player.playlist(episodes.map(e => ({ title: e.name, url: e.link_m3u8 })));
                                }
                            });
                        } else if (episodes.length === 1) {
                            // Phát luôn nếu là phim lẻ
                            Lampa.Player.play({ url: episodes[0].link_m3u8, title: detail.movie.name });
                        }
                    });
                } else {
                    Lampa.Noty.show('KKPhim không có phim này');
                }
            });
        };
    };

    function startPlugin() {
        var source = new KKPhimSource();

        // Lắng nghe sự kiện khi Lampa dựng xong trang chi tiết phim
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var body = e.object.render();
                
                // Mẹo: Tìm bất kỳ thẻ nào có chữ "Trailer" hoặc "Watch" để chèn cạnh nó
                var targetButton = body.find('.selector:contains("Trailer"), .selector:contains("Watch"), .selector:contains("Tập")').first();
                
                if (targetButton.length) {
                    var kkBtn = $('<div class="full-start__button selector button--kkphim"><span>KKPhim</span></div>');
                    
                    kkBtn.on('click:select', function () {
                        source.search(e.data);
                    });

                    targetButton.after(kkBtn);
                } else {
                    // Nếu không tìm thấy nút nào, chèn đại vào vùng chứa nút bấm
                    body.find('.full-start__buttons').append('<div class="full-start__button selector button--kkphim"><span>KKPhim</span></div>').on('click:select', function(){
                        source.search(e.data);
                    });
                }
            }
        });

        // Thêm một chút CSS để nút nổi bật
        $('body').append('<style>.button--kkphim{background: #ff9800 !important; color: #000 !important; font-weight: bold !important;}</style>');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
