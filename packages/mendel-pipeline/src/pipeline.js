const FsTree = require('./fs-tree');
const Transformer = require('./transformer');
const MendelBus = require('./bus');
const Initialize = require('./step/initialize');
const CommonIFT = require('./step/common-ift');
const debug = require('debug')('mendel');

module.exports = MendelPipeline;

function MendelPipeline(cwd, {
    transforms,
    commonTransformIds,
    watch=false,
    ignore=['_ignore_'],
}) {
    if (!transforms) {
        throw new Error('`transforms` field is required.');
    }

    // Common functions
    const bus = new MendelBus();
    const transformer = new Transformer(transforms);

    // Pipeline steps
    const initializer = new Initialize(bus, cwd);
    const watcher = new FsTree(bus, {cwd, ignore});
    const commonIFT = new CommonIFT(bus, transformer, {commonTransformIds});

    // Hook Store
    bus.on('dirAdded', (path) => watcher.subscribe(path));
    bus.on('sourceRemoved', (path) => watcher.unsubscribe(path));
    // When raw source is added, we need to do commmon indepdent file transforms first
    bus.on('sourceAdded', (filePath, rawSource) => commonIFT.transform(filePath, rawSource));

    bus.on('sourceTransformed', () => {});
    bus.on('depInvalidated', () => {});

    // Hook FsTrees
    watcher.on('unlink', (path) => bus.remove(path));
    watcher.on('add', (path, source) => bus.addEntry(path, source));
    watcher.on('change', (path, source) => bus.invalidate(path, source));

    // Hook Transformer
    commonIFT.on('done', (path, transformIds, source) => bus.addSource(path, transformIds, source));

    // COMMENCE!
    initializer.start();

    if (!watch) {
        let processingCount = 0;
        bus.on('sourceAdded', () => processingCount++);

        bus.on('sourceTransformed', () => {
            processingCount--;

            if (processingCount === 0) {
                debug(`Transform done!`);
                console.log(bus._cache._cache);
                process.exit(0);
            }
        });
    }
}
