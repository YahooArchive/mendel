const FsTree = require('./fs-tree');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const CommonIFT = require('./step/common-ift');
const debug = require('debug')('mendel');
const DepResolver = require('./step/deps');

module.exports = MendelPipeline;

function MendelPipeline(options) {
    // Common functions
    const registry = new MendelRegistry(options);
    const transformer = new Transformer(options.transforms);

    // Pipeline steps
    const initializer = new Initialize({registry, transformer}, options);
    const watcher = new FsTree({registry, transformer}, options);
    const commonIFT = new CommonIFT({registry, transformer}, options);
    const depsResolver = new DepResolver({registry, transformer}, options);

    // Hook Store
    registry.on('dirAdded', (path) => watcher.subscribe(path));
    registry.on('sourceRemoved', (path) => watcher.unsubscribe(path));
    // When raw source is added, we need to do commmon indepdent file transforms first
    registry.on('sourceAdded', (filePath) => {
        // console.log('-', filePath);
    });
    registry.on('dependenciesAdded', (filePath) => {
        if (registry.hasEntry(filePath)) {
            // console.log(registry.getEntry(filePath).debug());
        }
    });
    registry.on('dependenciesInvalidated', () => {});

    // Hook Transformer
    commonIFT.on('done', (path, transformIds, source) => registry.addSource(path, transformIds, source));

    // COMMENCE!
    initializer.start();

    if (options.watch !== true) {
        let processingCount = 0;
        registry.on('sourceTransformed', () => processingCount++);

        let to;
        registry.on('dependenciesAdded', () => {
            clearTimeout(to);
            to = setTimeout(() => {
                process.exit(0);
            }, 500);
            processingCount--;
            if (processingCount === 0) {
                debug(` done!`);
            }
        });
    }
}
