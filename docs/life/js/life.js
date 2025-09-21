const life = (function() {
    const SVG_NS = "http://www.w3.org/2000/svg";

    const PREGNANCY_DAYS = 280;
    const ACTIVE_LIFE_SPAN_YEARS = 67;
    const TOTAL_LIFE_SPAN_YEARS = 84;
    const DECLINE_TRANSITION_YEARS = 6;
    const DEATH_TRANSITION_YEARS = 3;
    const AFTER_DEATH_YEARS = 2;

    const BEFORE = "before";
    const PREGNANCY = "pregnancy";
    const LIFE = "life";
    const TRANSITION_LIFE_DECLINE = "transition_life_decline";
    const DECLINE = "decline";
    const TRANSITION_DECLINE_AFTER = "transition_decline_after";
    const AFTER = "after";
    const AFTER_AFTER = "after_after";

    function layout(width, height, cells) {
        let best = null;

        for(let cols = 1; cols < Math.sqrt(cells) + 1; cols++) {
            if (cells % cols !== 0) {
                continue;
            }
            const rows = cells / cols;

            for (const [q, p] of [[cols,rows], [rows,cols]]) {
                const w = width / q;
                const h = height / p;
                const score = Math.abs(w - h);
                if (best === null || best.score > score) {
                    best = { width: w, height: h, score: score, cols: q, rows: p };
                }
            }
        }
        return best;
    }

    const years = {
        first: (date) => {
            if (date.getMonth() >= 6) {
                return new Date(new Date(new Date(date).setMonth(6, 1)).setHours(0, 0, 0, 0));
            } else {
                return new Date(new Date(new Date(date).setMonth(0, 1)).setHours(0, 0, 0, 0));
            }
        },
        next: (date) => new Date(new Date(date).setFullYear(date.getFullYear() + 1)),
        prev: (date) => new Date(new Date(date).setFullYear(date.getFullYear() - 1)),
        before: 3,
        after: 4,
        slackBefore: 3,
        slackAfter: 7,
    };

    const months = {
        first: (date) => new Date(new Date(new Date(date).setDate(1))),
        next: (date) => new Date(new Date(date).setMonth(date.getMonth() + 1)),
        prev: (date) => new Date(new Date(date).setMonth(date.getMonth() - 1)),
        before: 12,
        after: 24,
        slackBefore: 10,
        slackAfter: 16,
    };

    const weeks = {
        first: (date) => {
            const day = date.getDay() || 7;
            if (day !== 1) {
                date = new Date(new Date(date).setHours(-24 * (day - 1)));
            }
            return new Date(date);
        },
        next: (date) => new Date(new Date(date).setDate(date.getDate() + 7)),
        prev: (date) => new Date(new Date(date).setDate(date.getDate() - 7)),
        before: 60,
        after: 72,
        slackBefore: 30,
        slackAfter: 50,
    };

    function generate(birthDate, interval, width, height) {
        const items = [];
        const inceptionDate = new Date(birthDate);
        const now = new Date();

        inceptionDate.setDate(birthDate.getDate() - PREGNANCY_DAYS);

        const periods = [
            { type : BEFORE, end: inceptionDate },
            { type : PREGNANCY, end: birthDate },
            { type : LIFE, end: new Date(new Date(birthDate).setFullYear(birthDate.getFullYear() + ACTIVE_LIFE_SPAN_YEARS - (DECLINE_TRANSITION_YEARS/2))) },
            { type : TRANSITION_LIFE_DECLINE, end: new Date(new Date(birthDate).setFullYear(birthDate.getFullYear() + ACTIVE_LIFE_SPAN_YEARS + (DECLINE_TRANSITION_YEARS/2))) },
            { type : DECLINE, end: new Date(new Date(birthDate).setFullYear(birthDate.getFullYear() + TOTAL_LIFE_SPAN_YEARS - DEATH_TRANSITION_YEARS)) },
            { type : TRANSITION_DECLINE_AFTER, end: new Date(new Date(birthDate).setFullYear(birthDate.getFullYear() + TOTAL_LIFE_SPAN_YEARS)) },
            { type : AFTER, end: new Date(new Date(birthDate).setFullYear(birthDate.getFullYear() + TOTAL_LIFE_SPAN_YEARS + AFTER_DEATH_YEARS)) },
            { type : AFTER_AFTER, end: new Date(Number.MAX_SAFE_INTEGER) }
        ];

        const typesCount = {};
        const generateItem = (date, type) => {
            typesCount[type] = (typesCount[type]|| 0) + 1;
            return {
                type : type,
                start: start,
                end: interval.next(start),
                isPast: now.getTime() >= interval.next(start).getTime(),
                isBirth: start.getTime() <= birthDate.getTime() && birthDate.getTime() < interval.next(start).getTime(),
                isNow: start.getTime() <= now.getTime() && now.getTime() < interval.next(start).getTime(),
            };
        };

        let start = interval.first(birthDate);
        for(let i = 0; i < interval.before; i++) {
            start = interval.prev(start);
        }

        let period = 0;
        while(periods[period].type !== AFTER_AFTER) {
            items.push(generateItem(start, periods[period].type));
            start = interval.next(start);
            if (periods[period].end < interval.next(start)) {
                period += 1;
            }
        }

        for(let i = 0; i < interval.after; i++) {
            items.push(generateItem(start, AFTER_AFTER));
            start = interval.next(start);
        }

        const layouts = [];
        let slackBefore = 0;
        let slackAfter = 0;
        for (let i = 0; i < interval.slackBefore + interval.slackAfter; i++) {
            layouts.push({...layout(width, height, items.length + i), slackAfter: slackAfter, slackBefore: slackBefore});
            if (i % 2 === 0 && slackBefore < interval.slackBefore) {
                slackBefore += 1;
            } else {
                slackAfter += 1;
            }
        }
        for (let i = 0; i < interval.slackBefore; i++) {
            layouts.push({...layout(width, height, items.length + i), slackAfter: interval.slackAfter, slackBefore: i });
        }
        layouts.sort((a, b) => a.score - b.score);


        start = new Date(items[0].start);
        for (let i = 0; i < layouts[0].slackBefore; i++) {
            start = interval.prev(start);
            items.unshift(generateItem(start, BEFORE));
        }
        start = new Date(items[items.length - 1].start);
        for (let i = 0; i < layouts[0].slackAfter; i++) {
            start = interval.next(start);
            items.push(generateItem(start, AFTER_AFTER));
        }

        for (let i = 0; i < items.length; i++) {
            items[i].total = typesCount[items[i].type];
            items[i].index = i === 0 ? 0 : (items[i -1].type === items[i].type ? items[i -1].index + 1 : 0);
        }

        return { items, ...layouts[0] };
    }

    function coordinates(layout, index) {
        const col = index % layout.cols;
        const row = Math.floor(index / layout.cols);
        return { row, col, x : col*layout.width, y : layout.height*row };
    }

    function gradientColor(start, end, fraction) {
        fraction = Math.min(Math.max(fraction, 0), 1);

        const parseRGB = hex => ((v=parseInt(hex.slice(1),16))=>([v>>16&255, v>>8&255,v&255 ]))();

        const [r1, g1, b1] = parseRGB(start);
        const [r2, g2, b2] = parseRGB(end);

        const r = Math.round(r1 + (r2 - r1) * fraction);
        const g = Math.round(g1 + (g2 - g1) * fraction);
        const b = Math.round(b1 + (b2 - b1) * fraction);

        return `rgb(${r},${g},${b})`;
    }

    function renderHeart(layout, index) {
        const s = Math.min(layout.width, layout.height);
        const xGap = Math.abs(layout.width - s)/2;
        const yGap = Math.abs(layout.height - s)/2;
        const { x, y } = coordinates(layout, index);

        const element = document.createElementNS(SVG_NS, "image")
        element.setAttribute("x", `${x + xGap}`);
        element.setAttribute("y", `${y + yGap}`);
        element.setAttribute("width", `${s}`);
        element.setAttribute("height", `${s}`);
        element.setAttribute("href", "images/heart.svg");
        return element;
    }

    function renderCircle(layout, index) {
        const s = Math.min(layout.width, layout.height);
        const radius = s / 2;
        const { x, y } = coordinates(layout, index);

        const element = document.createElementNS(SVG_NS, "circle");
        element.setAttribute("fill", "#333333");
        element.setAttribute("cx", `${x + radius}`);
        element.setAttribute("cy", `${y + radius}`);
        element.setAttribute("r", `${radius * .8}`);
        const item = layout.items[index];

        if (item.type === PREGNANCY) {
            element.setAttribute("opacity", `${(item.index + 1)/item.total}`);
        } else if (item.type === AFTER) {
            element.setAttribute("opacity", `${(item.total - (item.index + 1))/item.total}`);
        } else if (item.type === LIFE && !item.isPast) {
            element.setAttribute("fill", "#9CAF88");
        } else if (item.type === TRANSITION_LIFE_DECLINE && !item.isPast) {
            const color = gradientColor("#9CAF88", "#996515", (item.index + 1) / (item.total + 1));
            element.setAttribute("fill", color);
        } else if (item.type === TRANSITION_DECLINE_AFTER && !item.isPast) {
            const color = gradientColor("#996515", "#333333", (item.index + 1) / (item.total + 1));
            element.setAttribute("fill", color);
        } else if (item.type === DECLINE && !item.isPast) {
            element.setAttribute("fill", "#996515");
        }
        element.setAttribute("stroke", item.isPast ? (item.isBirth ? "#FFD700" : "#888888") : "#333333");
        return element;
    }

    function render(layout, index) {
        const item = layout.items[index];
        if (item.isNow) {
            return renderHeart(layout, index);
        } else if (item.type === BEFORE || item.type === AFTER_AFTER) {
            return null;
        }
        return renderCircle(layout, index);
    }

    return {
        period : {
            BEFORE,
            PREGNANCY,
            LIFE,
            TRANSITION_LIFE_DECLINE,
            DECLINE,
            TRANSITION_DECLINE_AFTER,
            AFTER,
            AFTER_AFTER,
        },

        render : render,

        generate : (dateOfBirth, type, width, height) => {
            if (type === "month") {
                return {...generate(dateOfBirth, months, width, height), type };
            } else if (type === "week") {
                return {...generate(dateOfBirth, weeks, width, height), type };
            }
            return {...generate(dateOfBirth, years, width, height), type };
        },
    };

})();