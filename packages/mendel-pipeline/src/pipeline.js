const debug = require('debug')('mendel:pipeline');
const analyticsCollector = require('./helpers/analytics/analytics-collector');
const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const Watcher = require('./step/fs-watcher');
const Reader = require('./step/fs-reader');
const IST = require('./step/ist');
const DepResolver = require('./step/deps');

module.exports = MendelPipeline;

function MendelPipeline(options) {
    analyticsCollector.setOptions({
        printer: new AnalyticsCliPrinter({enableColor: true}),
    });

    const registry = new MendelRegistry(options);
    const transformer = new Transformer(options.transforms, options);

    // Pipeline steps
    const initializer = new Initialize({registry, transformer}, options);
    const watcher = new Watcher({registry, transformer}, options);
    const reader = new Reader({registry, transformer}, options);
    const ist = new IST({registry, transformer}, options);
    const depsResolver = new DepResolver({registry, transformer}, options);

    const steps = [watcher, reader, ist, depsResolver];
    for (let i = 0; i < steps.length - 1; i++) {
        const curStep = steps[i];
        const nextStep = steps[i + 1];
        curStep.on('done', function({entryId}) {
            const entry = registry.getEntry(entryId);
            entry.incrementStep();
            nextStep.perform.apply(nextStep, [entry].concat(Array.prototype.slice.call(arguments, 1)));
        });
    }

    if (options.watch !== true) {
        let totalEntries = 0;
        let doneDeps = 0;

        watcher.on('done', () => totalEntries++);
        depsResolver.on('done', () => {
            doneDeps++;
            if (totalEntries === doneDeps) {
                debug(`${totalEntries} entries were processed.`);
                debug(
                    Array.from(registry._mendelCache._store.values())
                    .map(({id}) => id)
                    .join('\n')
                );
                process.exit(0);
            }
        });
    }

    // COMMENCE!
    initializer.start();
}
