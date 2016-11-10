const analyticsCollector = require('./helpers/analytics/analytics-collector');
const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const Watcher = require('./fs-watcher');
const Reader = require('./fs-reader');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const IST = require('./step/ist');
const debug = require('debug')('mendel');
const DepResolver = require('./step/deps');

module.exports = MendelPipeline;

function MendelPipeline(options) {
    analyticsCollector.setOptions({
        printer: new AnalyticsCliPrinter({enableColor: true}),
    });

    // Common functions
    const registry = new MendelRegistry(options);
    const transformer = new Transformer(options.transforms, options);

    // Pipeline steps
    const initializer = new Initialize({registry, transformer}, options);
    const watcher = new Watcher({registry, transformer}, options);
    const reader = new Reader({registry, transformer}, options);
    const ist = new IST({registry, transformer}, options);
    const depsResolver = new DepResolver({registry, transformer}, options);

    if (options.watch !== true) {
        let rawSources = 0;
        let totalEntries = 0;
        let doneDeps = 0;

        registry.on('entryAdded', () => totalEntries++);
        registry.on('sourceAdded', () => rawSources++);
        registry.on('dependenciesAdded', () => {
            doneDeps++;

            if (totalEntries === rawSources && totalEntries === doneDeps) {
                process.exit(0);
            }
        });
    }

    // COMMENCE!
    initializer.start();
}
