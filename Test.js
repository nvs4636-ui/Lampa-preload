// kkphim-source.js
(function(){
    'use strict';

    var PLUGIN_NAME = 'KKPhimSource';
    var DEFAULT_BASE = 'https://kkphim.com'; // đổi nếu cần
    var CACHE_TTL = 1000 * 60 * 5; // 5 phút

    // Simple storage helper
    var Storage = {
        get: function(key){
            try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null; }
        },
        set: function(key, val){
            try { localStorage.setItem(key, JSON.stringify(val)); } catch(e){}
        },
        remove: function(key){ try { localStorage.removeItem(key); } catch(e){} }
    };

    // Config UI (Lampa may show plugin settings if implemented)
    var Config = {
        key: 'kkphim_source_config',
        default: {
            base: DEFAULT_BASE,
            use_torrserve_for_magnet: false,
            torrserve_url: 'http://127.0.0.1:8090' // user can change
        },
        load: function(){
            var c = Storage.get(this.key) || {};
            return Object.assign({}, this.default, c);
        },
        save: function(cfg){
            Storage.set(this.key, cfg);
        }
    };

    function now(){ return Date.now(); }

    function cacheGet(key){
        var obj = Storage.get('kk_cache_' + key);
        if(!obj) return null;
        if(now() - (obj.t || 0) > CACHE_TTL) { Storage.remove('kk_cache_' + key); return null; }
        return obj.v;
    }

    function cacheSet(key, val){
        Storage.set('kk_cache_' + key, { t: now(), v: val });
    }

    // Safe fetch with JSON parse and optional headers
    function safeFetchJson(url, opts){
        opts = opts || {};
        // add simple headers to mimic browser
        opts.headers = opts.headers || {};
        opts.headers['Accept'] = 'application/json, text/javascript, */*; q=0.01';
        opts.headers['User-Agent'] = opts.headers['User-Agent'] || 'Mozilla/5.0 (Lampa Plugin)';
        return fetch(url, opts).then(function(res){
            if(!res.ok) throw new Error('HTTP ' + res.status);
            return res.json().catch(function(){ throw new Error('Invalid JSON'); });
        });
    }

    // Parse many possible shapes of KKPhim response into array of {title, url, quality, type}
    function parseSourcesFromData(data){
        var list = [];
        if(!data) return list;

        function pushIf(u, title, quality){
            if(!u) return;
            var type = (u.indexOf('magnet:') === 0) ? 'magnet' : (u.indexOf('.m3u8') !== -1 ? 'hls' : 'file');
            list.push({ title: title || 'KKPhim', url: u, quality: quality || '', type: type });
        }

        // common fields
        if(Array.isArray(data.sources)){
            data.sources.forEach(function(s){
                if(typeof s === 'string') pushIf(s, 'KK');
                else {
                    pushIf(s.link_m3u8 || s.file || s.url || s.magnet, s.name || s.title, s.quality);
                }
            });
        }

        if(Array.isArray(data.episodes)){
            data.episodes.forEach(function(ep){
                if(ep.sources && Array.isArray(ep.sources)){
                    ep.sources.forEach(function(s){
                        pushIf(s.link_m3u8 || s.file || s.url || s.magnet, s.name || ep.title || 'EP', s.quality);
                    });
                } else {
                    pushIf(ep.link_m3u8 || ep.file || ep.url || ep.magnet, ep.title, ep.quality);
                }
            });
        }

        // direct fields
        if(data.stream) pushIf(data.stream, 'KK stream', data.quality);
        if(data.file) pushIf(data.file, 'KK file', data.quality);
        if(data.link_m3u8) pushIf(data.link_m3u8, 'KK m3u8', data.quality);
        if(data.magnet) pushIf(data.magnet, 'KK magnet', data.quality);

        // some APIs return data.data or data.result
        if(data.data) return parseSourcesFromData(data.data).concat(list);
        if(data.result) return parseSourcesFromData(data.result).concat(list);

        // dedupe by url
        var seen = {};
        return list.filter(function(i){
            if(!i.url) return false;
            if(seen[i.url]) return false;
            seen[i.url] = true;
            return true;
        });
    }

    // Try multiple endpoints to find movie details
    function fetchMovieDetails(base, idOrSlug){
        var tries = [
            base + '/api/v1/movies/' + idOrSlug,
            base + '/api/v1/film/' + idOrSlug,
            base + '/api/v1/movie/' + idOrSlug,
            base + '/api/v1/films/' + idOrSlug
        ];
        var cacheKey = 'movie_' + idOrSlug;
        var cached = cacheGet(cacheKey);
        if(cached) return Promise.resolve(cached);

        function tryNext(i){
            if(i >= tries.length) return Promise.reject(new Error('No endpoint matched'));
            return safeFetchJson(tries[i]).then(function(json){
                cacheSet(cacheKey, json);
                return json;
            }).catch(function(){
                return tryNext(i+1);
            });
        }
        return tryNext(0);
    }

    // Search endpoint
    function searchMovies(base, query){
        var q = encodeURIComponent(query);
        var tries = [
            base + '/api/v1/search?keyword=' + q,
            base + '/api/v1/movies?search=' + q,
            base + '/api/v1/search?q=' + q
        ];
        var cacheKey = 'search_' + query;
        var cached = cacheGet(cacheKey);
        if(cached) return Promise.resolve(cached);

        function tryNext(i){
            if(i >= tries.length) return Promise.reject(new Error('No search endpoint'));
            return safeFetchJson(tries[i]).then(function(json){
                var arr = json.results || json.data || json.items || json;
                if(!Array.isArray(arr)) arr = [];
                var mapped = arr.map(function(it){
                    return {
                        title: it.title || it.name || it.original_title || it.slug || '',
                        id: it.id || it.slug || it.url || '',
                        poster: it.poster || it.image || it.cover || ''
                    };
                });
                cacheSet(cacheKey, mapped);
                return mapped;
            }).catch(function(){
                return tryNext(i+1);
            });
        }
        return tryNext(0);
    }

    // If magnet and user wants TorrServe, build TorrServe HTTP stream URL
    function magnetToTorrserve(cfg, magnet){
        if(!cfg.use_torrserve_for_magnet || !cfg.torrserve_url) return magnet;
        // TorrServe typical API: /torrent?magnet=... or /stream?magnet=...
        // We'll return a simple proxy path; user may need to adjust based on their TorrServe setup.
        try {
            var enc = encodeURIComponent(magnet);
            return cfg.torrserve_url.replace(/\/$/, '') + '/torrent?magnet=' + enc;
        } catch(e){
            return magnet;
        }
    }

    // Plugin registration
    var plugin = {
        manifest: {
            name: PLUGIN_NAME,
            version: '1.0.0',
            description: 'Nguồn phim từ KKPhim API (HLS, MP4, magnet). Có caching và tùy chọn TorrServe.'
        },
        init: function(){
            var cfg = Config.load();

            Lampa.Source.add({
                title: 'KKPhim',
                search: function(query, callback){
                    searchMovies(cfg.base, query).then(function(items){
                        callback(items);
                    }).catch(function(){
                        callback([]);
                    });
                },
                movie: function(movie, callback){
                    var id = movie.id || movie.tmdb_id || movie.slug || movie.url || movie.title;
                    if(!id) return callback([]);
                    fetchMovieDetails(cfg.base, id).then(function(json){
                        var sources = parseSourcesFromData(json);
                        // map magnet to torrserve if configured
                        sources = sources.map(function(s){
                            if(s.type === 'magnet') s.url = magnetToTorrserve(cfg, s.url);
                            return s;
                        });
                        callback(sources);
                    }).catch(function(){
                        callback([]);
                    });
                },
                tv: function(tv, season, episode, callback){
                    var id = tv.id || tv.slug || tv.url || tv.title;
                    if(!id) return callback([]);
                    // try tv-specific endpoints
                    var tries = [
                        cfg.base + '/api/v1/tv/' + id + '/season/' + season + '/episode/' + episode,
                        cfg.base + '/api/v1/series/' + id + '/season/' + season + '/episode/' + episode
                    ];
                    (function tryNext(i){
                        if(i >= tries.length) return callback([]);
                        safeFetchJson(tries[i]).then(function(json){
                            var sources = parseSourcesFromData(json);
                            sources = sources.map(function(s){
                                if(s.type === 'magnet') s.url = magnetToTorrserve(cfg, s.url);
                                return s;
                            });
                            callback(sources);
                        }).catch(function(){ tryNext(i+1); });
                    })(0);
                },
                resolve: function(item, callback){
                    // Lampa may call resolve to get final playable link
                    // If item.url is already playable, return as-is
                    callback(item);
                }
            });
        }
    };

    // Expose a simple settings UI hook (if Lampa supports plugin settings)
    // This is optional: some Lampa builds allow plugin settings via Lampa.Plugin.addSettings
    try {
        Lampa.Plugin.addSettings && Lampa.Plugin.addSettings({
            name: PLUGIN_NAME,
            fields: [
                { id: 'base', type: 'text', title: 'KKPhim Base URL', value: Config.load().base },
                { id: 'use_torrserve_for_magnet', type: 'checkbox', title: 'Use TorrServe for magnet', value: Config.load().use_torrserve_for_magnet },
                { id: 'torrserve_url', type: 'text', title: 'TorrServe URL', value: Config.load().torrserve_url }
            ],
            save: function(values){
                var cfg = Config.load();
                cfg.base = values.base || cfg.base;
                cfg.use_torrserve_for_magnet = !!values.use_torrserve_for_magnet;
                cfg.torrserve_url = values.torrserve_url || cfg.torrserve_url;
                Config.save(cfg);
                Lampa.Noty.show('KKPhim plugin', 'Cấu hình đã lưu', 2);
            }
        });
    } catch(e){ /* ignore if not supported */ }

    Lampa.Plugin.add(plugin);
})();