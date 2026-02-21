(function () {
    'use strict';

    function KKPhimProvider() {
        var network = new Lampa.Reguest();

        // Hàm này bóc tách dữ liệu từ KKPhim về chuẩn Lampa
        function extractVideo(data) {
            var movie = data.movie;
            var episodes = data.episodes[0].server_data;
            
            return episodes.map(function(ep) {
                return {
                    title: ep.name,
                    url: ep.link_m3u8,
                    quality: 'Full HD' // KKPhim thường là chất lượng tốt
                };
            });
        }

        // Đăng ký vào hệ thống tìm kiếm nguồn của Lampa
        this.search = function (object, callback) {
            if (object.movie.title) {
                var searchUrl = 'https://phimapi.com/v1/api/tim-kiem?keyword=' + encodeURIComponent(object.movie.title);
                
                network.silent(searchUrl, function (result) {
                    var list = result.data ? result.data.items : [];
                    var found = list.filter(function(i) {
                        // So khớp tên phim để tìm đúng nguồn
                        return i.name.toLowerCase() === object.movie.title.toLowerCase() || 
                               i.origin_name.toLowerCase() === object.movie.title.toLowerCase();
                    });

                    if (found.length > 0) {
                        // Nếu tìm thấy phim trên KKPhim, tạo một "thẻ" nguồn
                        callback([{
                            name: 'KKPhim',
                            method: function(call_success) {
                                fetch('https://phimapi.com/phim/' + found[0].slug)
                                    .then(res => res.json())
                                    .then(json => {
                                        call_success(extractVideo(json));
                                    });
                            }
                        }]);
                    } else {
                        callback([]); // Không tìm thấy thì thôi
                    }
                });
            }
        };
    }

    function startPlugin() {
        // Đăng ký KKPhim như một "Nguồn video" (Buttons trong thẻ phim)
        Lampa.Internal.listen('player:search', function (object) {
            var provider = new KKPhimProvider();
            provider.search(object, function (sources) {
                // Trả về danh sách server cho Lampa hiển thị
                object.callback(sources);
            });
        });
        
        Lampa.Noty.show('KKPhim đã được tích hợp làm nguồn phim!');
    }

    if (window.app_ready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });
})();
