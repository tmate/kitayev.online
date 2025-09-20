const fomo = (function() {

    const BEFORE = "before";
    const PREGNANCY = "pregnancy";
    const LIFE = "life";
    const TRANSITION_LIFE_DECLINE = "transition_life_decline";
    const DECLINE = "decline";
    const TRANSITION_DECLINE_AFTER = "transition_decline_after";
    const AFTER = "after";

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
                prevDate.setDate(prevDate.getDate() - daysInMonth(prevDate.getFullYear(), prevDate.getMonth()));
                return monthIterator(prevDate);
            },
            next: () => {
                const nextDate = new Date(start);
                nextDate.setDate(nextDate.getDate() + daysInMonth(nextDate.getFullYear(), nextDate.getMonth() + 1) + 1);
                return monthIterator(nextDate);
            },
        };
    }

    function yearIterator(date) {
        const start = new Date(date);
        start.setFullYear(date.getFullYear(), 0, 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setFullYear(date.getFullYear() + 1, 0, 1);
        end.setHours(0, 0, 0, 0);
        end.setMilliseconds(-1);

        return {
            start : start,
            end: end,
            prev: () => {
                const prevDate = new Date(start);
                prevDate.setFullYear(prevDate.getFullYear() - 1);
                return yearIterator(prevDate);
            },
            next: () => {
                const nextDate = new Date(start);
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                return yearIterator(nextDate);
            },
        };
    }

    function* intervals(birthDate, interval) {
        const inceptionDate = new Date(birthDate);
        inceptionDate.setDate(birthDate.getDate() - 280);

        const declineTransitionStartDate = new Date(birthDate);
        declineTransitionStartDate.setFullYear(birthDate.getFullYear() + 67);
        const declineTransitionEndDate = new Date(birthDate);
        declineTransitionEndDate.setFullYear(birthDate.getFullYear() + 72);

        const deathTransitionStartDate = new Date(birthDate);
        deathTransitionStartDate.setFullYear(birthDate.getFullYear() + 81);
        const deathDate = new Date(birthDate);
        deathDate.setFullYear(birthDate.getFullYear() + 84);

        const periods = [
            { type : BEFORE, end: inceptionDate },
            { type : PREGNANCY, end: birthDate },
            { type : LIFE, end: declineTransitionStartDate },
            { type : TRANSITION_LIFE_DECLINE, end: declineTransitionEndDate },
            { type : DECLINE, end: declineTransitionStartDate },
            { type : TRANSITION_DECLINE_AFTER, end: deathDate },
            { type : AFTER, end: new Date(Number.MAX_SAFE_INTEGER) }
        ];

        let item = interval(inceptionDate);
        item = item.prev();
        item = item.prev();

        let index = 0;
        let periodIndex = 0;
        let periodCount = 0;

        while(item.start < deathDate) {
            if (periods[periodIndex].end <= item.end) {
                periodIndex += 1;
                periodCount = 0;
            }
            periodCount += 1;
            yield { index, type: periods[periodIndex].type, ...item };
            item = item.next();
            index += 1;
        }

        for(let i = 0; i < 5; i++) {
            if (periods[periodIndex].end <= item.end) {
                periodIndex += 1;
                periodCount = 0;
            }
            yield { index, type: periods[periodIndex].type, ...item };
            item = item.next();
            index += 1;
        }
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
        },

        intervals : (dateOfBirth, type) => {
            if (type === "week") {
                return intervals(dateOfBirth, weekIterator);
            } else if (type === "year") {
                return intervals(dateOfBirth, yearIterator);
            }
            return intervals(dateOfBirth, monthIterator);
        },

        layout : (width, height, cells) => {
            let best = null;
            for(let i = 5; i > 1; i--) {
                const score = layout(width, height, cells + i);
                if (best === null || best.score > score.score) {
                    best = score;
                }
                if (i === 5 && best.score < 3) {
                    break;
                }
            }
            return best;
        }
    };

})();