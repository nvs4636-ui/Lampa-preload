(function () {
    'use strict';

    // 1. ĐỊNH NGHĨA KKPHIM TRƯỚC
    var KKPhimSource = {
        name: 'KKPhim (VN)',
        search: function (object, callback) {
            var title = object.movie.original_title || object.movie.title;
            var url = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(title);
            
            $.ajax({
                url: url,
                method: 'GET',
                timeout: 5000,
                success: function (res) {
                    var list = res.data ? res.data.items : [];
                    if (list[0]) {
                        $.getJSON('https://phimapi.com/phim/' + list[0].slug, function (d) {
                            var eps = d.episodes[0].server_data.map(e => ({
                                title: 'Tập ' + e.name,
                                url: e.link_m3u8,
                                quality: 'FullHD'
                            }));
                            callback(eps);
                        });
                    } else callback([]);
                },
                error: function () { callback([]); }
            });
        }
    };

    // 2. TẠO HÀM ĐĂNG KÝ NGUỒN
    function initKKPhim() {
        Lampa.Listener.follow('player:search', function (e) {
            KKPhimSource.search(e, function (res) {
                if (res.length > 0) {
                    // Dùng unshift thay vì push để đưa lên đầu danh sách
                    e.callback([{
                        name: KKPhimSource.name,
                        method: function (call) { call(res); }
                    }]);
                }
            });
        });
        console.log('KKPhim đã sẵn sàng chen hàng!');
    }

    // 3. THỰC THI: NẠP KKPHIM TRƯỚC, NẠP HỌ SAU
    if (window.app_ready) {
        initKKPhim();
        $.getScript('https://nb557.github.io/plugins/online_mod.js');
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') {
                initKKPhim();
                $.getScript('https://nb557.github.io/plugins/online_mod.js');
            }
        });
    }
})();
