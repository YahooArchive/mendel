const Analytics = require('./analytics').constructor;

class AnalyticsForWorker extends Analytics {
    constructor(grouping) {
        super(grouping);
    }

    record(name, time) {
        process.send({
            type: 'analytics',
            grouping: this.grouping,
            pid: process.pid,
            name,
            data: time,
        });
    }
}

module.exports = function(name) {
    return new AnalyticsForWorker(name);
};
