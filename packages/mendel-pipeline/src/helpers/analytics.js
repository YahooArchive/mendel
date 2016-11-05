class Analytics {
    constructor(grouping) {
        this.grouping = grouping;
        this.dataMap = new Map();
    }

    tic(name, value) {
        name = name || '-';
        this.dataMap.set(name, Date.now());
        return value;
    }

    toc(name, value) {
        name = name || '-';
        // Needs to no-op if there were tic before
        if (!this.dataMap.has(name)) return;

        const before = this.dataMap.get(name, Date.now());
        const after = Date.now();
        this.dataMap.get(name, after);

        this.record(name, after - before);
        return value;
    }

    record(name, time) {
        if (!global.analytics) {
            console.log('Analytics cannot be done without a collector');
            return;
        }

        global.analytics.record({
            type: 'analytics',
            grouping: this.grouping,
            pid: 'main',
            name,
            data: time,
        });
    }
}

module.exports = function(name) {
    return new Analytics(name);
};

module.exports.constructor = Analytics;
