(function(){
const localMode = location.protocol === 'file:';

const RATE_COLORS = {
    0: '#444444',
    1: '#444444',
    2: '#167f83',
    3: '#658519',
    4: '#a94710',
    5: '#95202e',
};

const SORT_TYPES = {
    OLDER_DATE: { symbol: 'olderDate', text: '視聴日時が古い順' },
    LASTEST_DATE: { symbol: 'lastestDate', text: '視聴日時が新しい順' },
    HIGHER_RATE: { symbol: 'higherRate', text: '評価が高い順' },
    LOWER_RATE: { symbol: 'lowerRate', text: '評価が低い順' },
};

const RankController = {
    _rankings: null,
    onLoaded(res) {
        const list = res.split(";");
        this._rankings = list.slice(0, list.length - 1).map((line, i) => {
            const [point = 0, title = '', desc = '', image] = line.split('|');
            return {
                id: i + 1,
                point: Number(point),
                title,
                searchTitle: title.toUpperCase(),
                desc: localMode ? desc.replace(/^\n+/, "") : '',
                image: localMode ? image : null,
            };
        });

        this.initRateGraph();
        this.initList();
        this.initSortElements();
        this.initInputForm();
    },
    initRateGraph() {
        $('<div>', { class: 'graphArea'})
            .appendTo($('.rateGraph'))
            .append(
                $('<div>', { class: 'graphDesc' }),
                $('<div>', { class: 'graphCenter' }).append($('<p>', { text: '0' }))
            );
        $(document.body).on('searchBoxChanged', (_, { filteredList }) => this.refreshRateGraph(filteredList));
        this.refreshRateGraph(this._rankings);
    },
    refreshRateGraph(rankings) {
        const ratesList = Object.keys(RATE_COLORS).map(
            key => rankings.filter(ranking => ranking.point === Number(key))
        );
        const graphDesc = $('div.graphDesc').empty();
        const cs = [];
        Object.keys(RATE_COLORS).reverse().reduce((r, key) => {
            const rate = ratesList[key].length / (rankings.length || 1);
            cs.push({ color: RATE_COLORS[key], r1: r * 100, r2: (r + rate) * 100 });
            $('<p>', {
                html: `<span>${key}</span><br>${ratesList[key].length}(${Math.floor(rate * 100)}%)`,
                css: { '--posRate': (r + rate * 0.5 - 0.25), 'display': rate === 0 ? 'none' : 'inherit' },
            })
                .appendTo(graphDesc);
            return r + rate;
        }, 0);

        $('div.graphArea').css({
            backgroundImage: `conic-gradient(${cs.map(({ color, r1, r2 }) => `${color} ${r1}%, ${color} ${r2}%`)})`,
        });
        $('div.graphCenter p').text(rankings.length);
    },
    initSortElements() {
        const search = new URLSearchParams(window.location.search);
        const sortType = Object.values(SORT_TYPES).find(val => val.symbol === search.get('sortType'))
            || SORT_TYPES.OLDER_DATE;

        const options = Object.keys(SORT_TYPES).map(key => {
            const type = SORT_TYPES[key];
            return $('<option>', { text: type.text, value: key, selected: sortType === type });
        });
        $('#filter')
            .append(options)
            .on('change', e => {
                const sortType = e.target.value;
                const search = new URLSearchParams(window.location.search);
                search.set('sortType', SORT_TYPES[sortType].symbol);
                window.history.pushState({}, '', `${window.location.pathname}?${search.toString()}`);
                $(document.body).trigger('sortTypeChanged', SORT_TYPES[sortType]);
            });

        $(document.body).trigger('sortTypeChanged', sortType);
    },
    initList() {
        const movieList = this._rankings.map(({ id, point, title, desc, image }) => {
            const content = $('<div>', { class: 'content' });
            const li = $('<li>', {
                class: 'movieInfo',
                css: { '--cardColor': RATE_COLORS[point] },
                'data-id': id,
                'data-point': point,
            })
                .append(
                    $('<div>', { class: 'number' }).append(
                        $('<div>', { class: 'id', text: id }),
                        $('<div>', { class: 'rate', text: "★".repeat(point) }),
                    ),
                    content,
                );

            if (image) {
                $('<img', { src: `img/${image}.jpg`, alt: image }).appendTo(content);
            }
            $('<h3>', { class: 'title', text: title }).appendTo(content);
            if (desc) {
                $('<p>', { class: 'desc', text: desc }).appendTo(content);
                $('<button>', { text: '表示', click: () => li.addClass('shown') }).appendTo(content);
            }
            return li;
        });

        $(document.body).on('sortTypeChanged', (_, sortType) => {
            const compare = (key, a, b) => a.data(key) > b.data(key) ? 1 : -1;
            const list = movieList.toSorted((a, b) => {
                switch (sortType) {
                case SORT_TYPES.OLDER_DATE:   return compare('id', a, b);
                case SORT_TYPES.LASTEST_DATE: return compare('id', b, a);
                case SORT_TYPES.HIGHER_RATE:  return compare('point', b, a);
                case SORT_TYPES.LOWER_RATE:   return compare('point', a, b);
                };
                return 0;
            });
            $("#movieArea").empty().append(list);
        });
        $(document.body).on('searchBoxChanged', (_, { filteredList }) => {
            movieList.forEach(child => {
                const display = filteredList.some(({ id }) => child.data('id') === id) ? 'inherit' : 'none';
                child.css({ display });
            });
        });
    },
    filterBySearchBox(text) {
        return this._rankings.filter(({ searchTitle }) => searchTitle.includes(text));
    },
    initInputForm() {
        $('#searchBox').on('change', e => {
            const text = (e.target.value || "").toUpperCase();
            const filteredList = this.filterBySearchBox(text);
            $(document.body).trigger('searchBoxChanged', { text, filteredList });
        });
    },
};

$().ready(() => RankController.onLoaded(TEXTS));
})();
