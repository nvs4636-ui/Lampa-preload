(function() {
    'use strict';

    if (!window.Lampa) return;

    const API = 'https://phimapi.com/v1/api';

    function fetchJSON(url) {
        return fetch(url).then(r => r.json());
    }

    Lampa.Plugin.add('KKPhim Mod', {
        type: 'online',

        search: function(item) {
            let keyword = item.original_title || item.title;
            let url = API + '/tim-kiem?keyword=' + encodeURIComponent(keyword);

            return fetchJSON(url).then(json => {
                let items = json.data?.items || [];

                let results = items.filter(m => {
                    if (item.type === 'movie' && m.type !== 'single') return false;
                    if (item.type === 'tv' && m.type !== 'series') return false;
                    if (item.year && m.year && Math.abs(item.year - m.year) > 1) return false;
                    return true;
                });

                return results.map(m => ({
                    title: m.name,
                    slug: m.slug,
                    url: API + '/phim/' + m.slug,
                    server: 'KKPhim'
                }));
            }).catch(() => []);
        },

        play: function(source, item) {
            return fetchJSON(item.url).then(json => {
                let movie = json.movie;
                let episodes = json.episodes || [];

                // PHIM LẺ
                if (movie.type === 'single') {
                    let links = [];
                    episodes.forEach(srv => {
                        srv.server_data.forEach(ep => {
                            if (ep.link_m3u8) {
                                links.push({
                                    url: ep.link_m3u8,
                                    quality: 'auto',
                                    server: `${srv.server_name || 'KKPhim'}`
                                });
                            }
                        });
                    });
                    return links;
                }

                // PHIM BỘ
                let playlist = [];
                episodes.forEach(srv => {
                    srv.server_data.forEach(ep => {
                        if (ep.link_m3u8) {
                            playlist.push({
                                title: ep.name,
                                url: ep.link_m3u8,
                                quality: 'auto',
                                server: `${srv.server_name || 'KKPhim'}`
                            });
                        }
                    });
                });
                return playlist;
            }).catch(() => []);
        }
    });

})();