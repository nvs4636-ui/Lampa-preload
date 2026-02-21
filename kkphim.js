(function () {
    'use strict';

    if (!window.Lampa) return;

    const API = 'https://phimapi.com/v1/api';

    function fetchJSON(url) {
        return fetch(url).then(r => r.json());
    }

    Lampa.Plugin.add('KKPhim Online', {
        type: 'online',

        // bước 1: Lampa gọi khi bấm phim
        search: function (item) {
            let keyword = item.original_title || item.title;
            let url = API + '/tim-kiem?keyword=' + encodeURIComponent(keyword);

            return fetchJSON(url).then(json => {
                let items = json?.data?.items || [];

                let matched = items.filter(m => {
                    if (item.type === 'movie' && m.type !== 'single') return false;
                    if (item.type === 'tv' && m.type !== 'series') return false;

                    if (item.year && m.year) {
                        if (Math.abs(item.year - m.year) > 1) return false;
                    }
                    return true;
                });

                return matched.map(m => ({
                    title: m.name,
                    slug: m.slug,
                    server: 'KKPhim'
                }));
            });
        },

        // bước 2: Lampa gọi để play
        play: function (source, item) {
            let url = API + '/phim/' + source.slug;

            return fetchJSON(url).then(json => {
                let movie = json.movie;
                let episodes = json.episodes || [];

                // 🎬 PHIM LẺ
                if (movie.type === 'single') {
                    let links = [];

                    episodes.forEach(server => {
                        server.server_data.forEach(v => {
                            if (v.link_m3u8) {
                                links.push({
                                    url: v.link_m3u8,
                                    quality: 'auto',
                                    server: 'KKPhim'
                                });
                            }
                        });
                    });

                    return links;
                }

                // 📺 PHIM BỘ
                let playlist = [];

                episodes.forEach(server => {
                    server.server_data.forEach(ep => {
                        if (ep.link_m3u8) {
                            playlist.push({
                                title: ep.name,
                                url: ep.link_m3u8,
                                quality: 'auto',
                                server: 'KKPhim'
                            });
                        }
                    });
                });

                return playlist;
            });
        }
    });

})();