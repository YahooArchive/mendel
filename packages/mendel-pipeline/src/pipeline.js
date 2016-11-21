const debug = require('debug')('mendel:pipeline');
const analyticsCollector = require('./helpers/analytics/analytics-collector');
const AnalyticsCliPrinter = require('./helpers/analytics/cli-printer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const Reader = require('./step/fs-reader');
const IST = require('./step/ist');

const EventEmitter = require('events').EventEmitter;

module.exports = class MendelPipeline extends EventEmitter {
    constructor ({options, cache, transformer, depsResolver}) {
        super();
        this.cache = cache;

        analyticsCollector.setOptions({
            printer: new AnalyticsCliPrinter({enableColor: true}),
        });

        const registry = this._registry = new MendelRegistry(options, cache);
        const toolset = {
            cache, registry,
            transformer, depsResolver,
        };

        // Pipeline steps
        const initializer = new Initialize(toolset, options);
        const reader = new Reader(toolset, options);
        const ist = new IST(toolset, options);
        const steps = [initializer, reader, ist];

        steps.forEach((curStep, i) => {
            const nextStep = i < steps.length - 1 ? steps[i + 1] : null;
            curStep.on('done', function({entryId}) {
                const entry = registry.getEntry(entryId);
                if (!nextStep) return;
                nextStep.perform.apply(
                    nextStep,
                    [entry].concat(Array.prototype.slice.call(arguments, 1))
                );
            });
        });

        this.steps = steps;
    }

    watch() {
        debug('working');

        let startedEntries = 0;
        let doneEntries = 0;

        this.steps[0]
            .on('done', () => startedEntries++);

        this.steps[this.steps.length-1]
            .on('done', () => { doneEntries++;

                if (startedEntries === doneEntries) {

                    const total = this.cache.size();
                    debug(`${doneEntries} entries were processed.`);
                    debug(`${total} entries in registry.`);

                    startedEntries = 0;
                    doneEntries = 0;

                    this.emit('idle', doneEntries);
                }
            });

        this.steps[0].start();
    }

    run() {
        this.on('idle', () => {
            const breakLine = '\n    ';
            const entries = this.cache.entries();
            debug(
                breakLine + entries.map(({id}) => id).join(breakLine)
            );
            process.exit(0);
        });
        this.watch();
    }
};
