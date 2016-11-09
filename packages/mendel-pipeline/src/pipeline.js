const analyticsCollector = require('./helpers/analytics/analytics-collector');
const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const FsTree = require('./fs-tree');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const CommonIFT = require('./step/common-ift');
const debug = require('debug')('mendel');
const DepResolver = require('./step/deps');

module.exports = MendelPipeline;

function MendelPipeline(options) {
    analyticsCollector.setOptions({
        printer: new AnalyticsCliPrinter({enableColor: true})
    });

    // Common functions
    const registry = new MendelRegistry(options);
    const transformer = new Transformer(options.transforms);

    // Pipeline steps
    const initializer = new Initialize({registry, transformer}, options);
    const watcher = new FsTree({registry, transformer}, options);
    const commonIFT = new CommonIFT({registry, transformer}, options);
    const depsResolver = new DepResolver({registry, transformer}, options);

    if (options.watch !== true) {
        let rawSources = 0;
        let totalSources = 0;
        let doneDeps = 0;

        watcher.on('add', () => {
            rawSources++;
        });

        registry.on('sourceAdded', () => {
            totalSources++;
        });

        registry.on('dependenciesAdded', () => {
            doneDeps++;

            if (totalSources >= rawSources && doneDeps === totalSources) {
                debug(`done!`);
                process.exit(0);
            }
        });
    }

    // COMMENCE!
    initializer.start();
}
