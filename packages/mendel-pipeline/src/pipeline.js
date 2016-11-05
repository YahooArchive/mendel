const analyticsCollector = require('./helpers/analytics-collector');
const FsTree = require('./fs-tree');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const CommonIFT = require('./step/common-ift');
const debug = require('debug')('mendel');
const DepResolver = require('./step/deps');

module.exports = MendelPipeline;

function MendelPipeline(options) {
    process.on('exit', () => analyticsCollector.print());

    // Common functions
    const registry = new MendelRegistry(options);
    const transformer = new Transformer(options.transforms);

    // Pipeline steps
    const initializer = new Initialize({registry, transformer}, options);
    const watcher = new FsTree({registry, transformer}, options);
    const commonIFT = new CommonIFT({registry, transformer}, options);
    const depsResolver = new DepResolver({registry, transformer}, options);

    if (options.watch !== true) {
        let processingCount = 0;
        registry.on('sourceTransformed', () => processingCount++);

        let to;
        registry.on('dependenciesAdded', () => {
            clearTimeout(to);
            to = setTimeout(() => {
                process.exit(0);
            }, 5000);

            processingCount--;
            if (processingCount === 0) {
                debug(` done!`);
            }
        });
    }

    // COMMENCE!
    initializer.start();

}
