class Analytics {
    constructor(groupName) {
        this.groupName = groupName;
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

        this.record(name, before, after);
        return value;
    }

    record(name, before, after) {
        // Analytics cannot be done without a collector
        if (!global.analytics) return;
        global.analytics.record({
            type: 'analytics',
            name: `main:${this.groupName}:${name}`,
            before,
            after,
        });
    }
}

module.exports = function(name) {
    return new Analytics(name);
};

module.exports.constructor = Analytics;
