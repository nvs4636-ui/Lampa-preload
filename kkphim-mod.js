(function () {
    'use strict';

    // 1. GỌI FILE GỐC CỦA HỌ VÀO TRƯỚC (IMPORT)
    // Cách này giúp giữ nguyên toàn bộ nguồn: HDrezka, Filmix, v.v.
    $.getScript('https://nb557.github.io/plugins/online_mod.js', function() {
        console.log('Online Mod gốc đã nạp xong!');
    });

    // 2. CHÈN THÊM NGUỒN KKPHIM CỦA MÌNH VÀO
    function startKKPhim() {
        var KKPhimSource = {
            name: 'KKPhim (VN)',
            search: function (object, callback) {
                var title = object.movie.original_title || object.movie.title;
                var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);
                
                $.getJSON(url, function (res) {
                    var list = res.data ? res.data.items : [];
                    var movie = list[0];
                    if (movie) {
                        $.getJSON('https://phimapi.com/phim/' + movie.slug, function (d) {
                            var eps = d.episodes[0].server_data.map(function(e) {
                                return {
                                    title: 'Tập ' + e.name,
                                    url: e.link_m3u8,
                                    quality: 'FullHD'
                                };
                            });
                            callback(eps);
                        });
                    } else callback([]);
                });
            }
        };

        // Đăng ký vào hệ thống Source của Lampa
        Lampa.Listener.follow('player:search', function (e) {
            KKPhimSource.search(e, function (res) {
                if (res.length > 0) {
                    e.callback([{
                        name: KKPhimSource.name,
                        method: function (call) { call(res); }
                    }]);
                }
            });
        });
        
        console.log('KKPhim đã được "tiêm" vào danh sách nguồn!');
    }

    // Đợi app sẵn sàng rồi mới chạy
    if (window.app_ready) startKKPhim();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startKKPhim(); });
})();
