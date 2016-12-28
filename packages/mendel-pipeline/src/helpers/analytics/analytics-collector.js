class AnalyticsCollector {
    constructor(options) {
        this.options = options || {};
        this.data = [];

        global.analytics = this;
        process.on('message', () => this.record());
        process.on('mendelExit', (code) => {
            if (code === 0 && this.options.printer) {
                this.options.printer.print(this.data);
            }
        });
    }

    setOptions(options) {
        this.options = options;
    }

    connectProcess(childProces) {
        childProces.on('message', this.record.bind(this));
    }

    record(message) {
        if (!message || message.type !== 'analytics') return;

        const {pid, name, after, before} = message;
        this.data.push({
            name,
            pid,
            before,
            after,
            timestamp: Date.now(),
        });
    }
}

// Singleton
module.exports = (function() {return new AnalyticsCollector();})();
