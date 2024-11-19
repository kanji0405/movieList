const localMode = location.href.startsWith('file://');

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
    _sortType: SORT_TYPES.OLDER_DATE,
    _rankings: null,
    onLoaded(res) {
        const list = res.split(";");
        this._rankings = list.slice(0, list.length - 1).map((line, i) => {
            const [point = 0, title = '', desc = '', image] = line.split('|');
            return {
                id: i + 1,
                point: Number(point),
                title,
                desc: localMode ? desc.replace(/^\n+/, "") : '',
                image: localMode ? image : null,
            };
        });

        const sortKey = location.hash.replace(/^#/, "");
        this._sortType = Object.values(SORT_TYPES).find(val => val.symbol === sortKey)
            || SORT_TYPES.OLDER_DATE;
        this.refreshSortElements();
        this.refreshRateGraph();
        this.refreshList();
    },
    refreshRateGraph() {
        const ratesList = Object.keys(RATE_COLORS).map(
            key => this._rankings.filter(ranking => ranking.point === Number(key))
        );
        const graph = document.querySelector('.rateGraph');
        let cs = '';
        let ps = '';
        Object.keys(RATE_COLORS).reverse().reduce((r, key) => {
            const rate = ratesList[key].length / this._rankings.length;
            cs += `${RATE_COLORS[key]} ${r * 100}%, ${RATE_COLORS[key]} ${(r + rate) * 100}%,`;
            ps += `
            <p style='--posRate: ${(0.5 - (r + rate * 0.5))}; ${rate === 0 ? 'display: none;' : ''}'>
                <span>${key}</span>
                <br>
                ${ratesList[key].length}(${Math.floor(rate * 100)}%)
            </p>
            `;
            return r + rate;
        }, 0);

        graph.innerHTML = `
            <div class='graphArea' style='background-image: conic-gradient(${cs.replace(/,$/, '')});'>
            <p>${this._rankings.length}件</p>
            <div class='graphDesc'>${ps}</div>
        `;
    },
    refreshSortElements() {
        const target = document.getElementById("filter");
        target.innerHTML = Object.keys(SORT_TYPES).reduce((r, key) => {
            const { text } = SORT_TYPES[key];
            return r.concat(
                `<option value='${key}' ${this._sortType === SORT_TYPES[key] ? 'selected' : ''}>${text}</option>`
            );
        }, '');
        target.addEventListener('change', this.sortRanking.bind(this, target));
    },
    sortRanking(target) {
        this._sortType = SORT_TYPES[target.value];
        location.hash = this._sortType.symbol;
        this.refreshList();
    },
    refreshList() {
        const array = this._rankings.slice();
        switch (this._sortType) {
            case SORT_TYPES.OLDER_DATE:   break;
            case SORT_TYPES.LASTEST_DATE: array.reverse(); break;
            case SORT_TYPES.HIGHER_RATE:  array.sort((a, b) => b.point - a.point); break;
            case SORT_TYPES.LOWER_RATE:   array.sort((a, b) => a.point - b.point); break;
        };
        document.getElementById("movieArea").innerHTML = array.reduce((r, { id, point, title, desc, image }) => {
            const button = desc ?
                `<button onclick='RankController.showReview(${id})'>表示</button>` : '';
            return r.concat(`
                <li class='movieInfo' value='${id}' style='--cardColor: ${RATE_COLORS[point]}'>
                    <div class='number'>
                        <div class='id'>${id}</div>
                        <div class='rate'>${"★".repeat(point)}</div>
                    </div>
                    <div class='content'>
                        ${image ? `<img src='img/${image}.jpg' alt='${image}'>` : ''}
                        <h3 class='title'>${title}</h3>
                        ${button}
                        <p class='desc'>${desc.replace(/\n/g, '<br>')}</p>
                    </div>
                </li>
            `);
        }, '');
    },
    showReview(id) {
        const desc = document.querySelector(`.movieInfo[value="${id}"]`);
        desc.classList.add('shown');
    },
};

Promise.all([
    new Promise(resolve => {
        const script = document.createElement('script');
        script.src = './formatted.txt';
        script.addEventListener('load', resolve);
        document.head.appendChild(script);
    }),
    new Promise(resolve => window.addEventListener('load', resolve))
])
    .then(() => RankController.onLoaded(TEXTS));