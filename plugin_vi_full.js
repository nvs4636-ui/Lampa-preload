(function () {
    'use strict';

    function waitLampa(callback) {
        if (window.Lampa && Lampa.Lang && Lampa.Storage) {
            callback();
        } else {
            setTimeout(function () {
                waitLampa(callback);
            }, 500);
        }
    }

    waitLampa(function () {

        var vi = {
            search: 'Tìm kiếm',
            settings: 'Cài đặt',
            movies: 'Phim lẻ',
            tv: 'Phim bộ',
            cartoons: 'Hoạt hình',
            anime: 'Anime',
            genres: 'Thể loại',
            year: 'Năm',
            rating: 'Đánh giá',
            loading: 'Đang tải...',
            empty: 'Không có dữ liệu',
            error: 'Đã xảy ra lỗi',
            retry: 'Thử lại',
            cancel: 'Hủy',
            ok: 'OK',
            watch: 'Xem',
            continue: 'Xem tiếp',
            favorite: 'Yêu thích',
            history: 'Lịch sử',
            quality: 'Chất lượng',
            subtitle: 'Phụ đề',
            audio: 'Âm thanh',
            yes: 'Có',
            no: 'Không'
        };

        // Lấy ngôn ngữ hiện tại làm fallback
        var base = Lampa.Lang.get() || {};
        var result = {};

        Object.keys(base).forEach(function (key) {
            result[key] = vi[key] || base[key];
        });

        // Đăng ký ngôn ngữ
        Lampa.Lang.add({
            name: 'Tiếng Việt',
            code: 'vi',
            data: result
        });

        // Set ngôn ngữ
        Lampa.Storage.set('language', 'vi');
        Lampa.Lang.set('vi');

        console.log('✅ Lampa Vietnamese language loaded');
    });
})();