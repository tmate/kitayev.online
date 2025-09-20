const life = (function() {

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

    function populateItemFractions(items) {
        const distribution = {};
        for (let item of items) {
            if (distribution[item.type]) {
                distribution[item.type] += 1;
            } else {
                distribution[item.type] = 1;
            }
        }
        let base = 0;
        let type = null;
        for (let item of items) {
            if (item.type !== type) {
                base = 0;
            }
            item.fraction = base + (1/distribution[item.type]);
            type = item.type;
            base = item.fraction;
        }

        return items;
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

        const generateItem = (date, type) => {
            return {
                type : type,
                start: start,
                end: interval.next(start),
                isPast: now.getTime() >= interval.next(start).getTime(),
                isBirth: start.getTime() <= birthDate.getTime() && birthDate.getTime() < interval.next(start).getTime(),
                isNow: start.getTime() <= now.getTime() && now.getTime() < interval.next(start).getTime(),
            }
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

        return { items: populateItemFractions(items), ...layouts[0] };
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

        generate : (dateOfBirth, type, width, height) => {
            if (type === "month") {
                return generate(dateOfBirth, months, width, height);
            } else if (type === "week") {
                return generate(dateOfBirth, weeks, width, height);
            }
            return generate(dateOfBirth, years, width, height);
        },
    };

})();