const fomo = (function() {

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

    function weekIterator(date) {
        const start = new Date(date);
        start.setDate(date.getDate() - (date.getDay()));
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setDate(date.getDate() + (7 - (date.getDay())));
        end.setHours(0, 0, 0, 0);
        end.setMilliseconds(-1);

        return {
            start : start,
            end: end,
            prev: () => {
                const prevDate = new Date(start);
                prevDate.setDate(prevDate.getDate() - 7);
                return weekIterator(prevDate);
            },
            next: () => {
                const nextDate = new Date(start);
                nextDate.setDate(nextDate.getDate() + 7);
                return weekIterator(nextDate);
            },
        };
    }

    function monthIterator(date) {
        const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
        const start = new Date(date);
        start.setDate(1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setDate(1 + daysInMonth(date.getFullYear(), date.getMonth() + 1));
        end.setHours(0, 0, 0, 0);
        end.setMilliseconds(-1);

        return {
            start : start,
            end: end,
            prev: () => {
                const prevDate = new Date(start);
                prevDate.setDate(prevDate.getDate() - daysInMonth(prevDate.getFullYear(), prevDate.getMonth() + 1));
                return monthIterator(prevDate);
            },
            next: () => {
                const nextDate = new Date(start);
                nextDate.setDate(nextDate.getDate() + daysInMonth(nextDate.getFullYear(), nextDate.getMonth() + 1) + 1);
                return monthIterator(nextDate);
            },
        };
    }

    function* intervals(dateOfBirth, interval, options={}) {
        const {
            includeInception=true,
            includeBeforeInception=1,
            includeBeforeBirth=1,
            includeAfterDeath=2
        } = options;

        const [year, month, day] = dateOfBirth.split("-");
        const birthDate = new Date(year, month - 1, day);
        const currentDate = new Date();
        const inceptionDate = new Date(birthDate);
        inceptionDate.setDate(birthDate.getDate() - 280);
        const deathDate =  new Date(birthDate);
        deathDate.setFullYear(birthDate.getFullYear() + 69);

        let item = interval(birthDate);
        let index = 0;
        while(item.end.getTime() < deathDate.getTime()) {
            yield {
                index,
                contains: (d) => d.getTime() >= item.start && d.getTime() <= item.end,
                ...item
            };
            item = item.next();
            index += 1;
        }
    }

    return {
        weekIntervals : (dateOfBirth) => intervals(dateOfBirth, weekIterator),
        monthIntervals : (dateOfBirth) => intervals(dateOfBirth, monthIterator),

        layout : (width, height, cells) => {
            let best = null;
            for(let i = 0; i < Math.ceil(cells/10); i++) {
                const score = layout(width, height, cells + i);
                if (best === null || best.score > score.score) {
                    best = score;
                }
                if (i === 0 && best.score < 3) {
                    break;
                }
            }
            return best;
        }
    };
})();