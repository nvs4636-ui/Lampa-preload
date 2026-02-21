(function () {
    'use strict';

    function startPlugin() {
        // 1. Định nghĩa bộ tìm kiếm nguồn KKPhim
        var KKPhimSource = function() {
            this.search = function(object, callback) {
                var title = object.movie.original_title || object.movie.title || object.movie.name;
                var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);

                $.ajax({
                    url: url,
                    dataType: 'json',
                    success: function(res) {
                        var list = res.data ? res.data.items : [];
                        if (list.length > 0) {
                            // Nếu tìm thấy, trả về một "Source" cho Lampa
                            callback([{
                                name: 'KKPhim',
                                title: 'Xem Online (KKPhim)',
                                method: function(call_success) {
                                    $.getJSON('https://phimapi.com/phim/' + list[0].slug, function(detail) {
                                        var eps = detail.episodes[0].server_data;
                                        var playlist = eps.map(e => ({ title: e.name, url: e.link_m3u8 }));
                                        
                                        Lampa.Player.play({
                                            url: eps[0].link_m3u8,
                                            title: detail.movie.name
                                        });
                                        Lampa.Player.playlist(playlist);
                                        call_success();
                                    });
                                }
                            }]);
                        } else {
                            callback([]);
                        }
                    },
                    error: function() { callback([]); }
                });
            };
        };

        // 2. ÉP BUỘC CHÈN NÚT VÀO THANH CÔNG CỤ (Sửa lỗi hiển thị liệt menu)
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var render = e.object.render();
                
                // Tạo một nút bấm độc lập, không phụ thuộc vào class của bản Mod
                var kkBtn = $('<div class="full-start__button selector kk-special-btn" style="background: #e67e22 !important; color: #fff !important; margin-top: 10px; border-radius: 8px; display: block; width: 100%; text-align: center; padding: 12px 0; font-weight: bold;">KKPHIM: XEM NGAY</div>');

                kkBtn.on('click:select', function () {
                    var s = new KKPhimSource();
                    s.search(e.data, function(sources) {
                        if (sources.length > 0) sources[0].method(function(){});
                        else Lampa.Noty.show('KKPhim không có phim này');
                    });
                });

                // Chèn vào vị trí 'an toàn' nhất: Dưới cùng của phần giới thiệu phim
                var footer = render.find('.full-start__left, .full-start__content').last();
                if (footer.length) {
                    footer.append(kkBtn);
                    // Cập nhật lại danh sách selector để Remote có thể di chuyển vào nút
                    if (e.object.context) e.object.context();
                }
            }
        });
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
