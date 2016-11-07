const Analytics = require('./analytics').constructor;

class AnalyticsForWorker extends Analytics {
    record(name, before, after) {
        process.send({
            type: 'analytics',
            name: `${process.pid}:${this.groupName}:${name}`,
            before,
            after,
        });
    }
}

module.exports = function(name) {
    return new AnalyticsForWorker(name);
};
