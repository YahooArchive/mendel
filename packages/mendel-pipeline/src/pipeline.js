const FsTree = require('./fs-tree');
const Transformer = require('./transformer');
const MendelRegistry = require('./registry');
const Initialize = require('./step/initialize');
const CommonIFT = require('./step/common-ift');
const BundleIFT = require('./step/bundle-ift');
const debug = require('debug')('mendel');
const DepResolver = require('./step/deps');

module.exports = MendelPipeline;

function MendelPipeline(cwd, {
    transforms,
    commonTransformIds,
    watch=false,
    bundles,
    basetree,
    variationsdir,
    ignore=['_ignore_'],
}) {
    if (!transforms) {
        throw new Error('`transforms` field is required.');
    }

    // Common functions
    const registry = new MendelRegistry();
    const transformer = new Transformer(transforms);

    // Pipeline steps
    const initializer = new Initialize(registry, cwd);
    const watcher = new FsTree(registry, {cwd, ignore});
    const commonIFT = new CommonIFT({registry, transformer}, {commonTransformIds});
    const depsResolver = new DepResolver({registry}, {cwd, basetree, variationsdir});
    const bundleIft = new BundleIFT({registry, transformer}, {bundles})

    // Hook Store
    registry.on('dirAdded', (path) => watcher.subscribe(path));
    registry.on('sourceRemoved', (path) => watcher.unsubscribe(path));
    // When raw source is added, we need to do commmon indepdent file transforms first

    registry.on('dependenciesAdded', () => {});
    registry.on('dependenciesInvalidated', () => {});

    // Hook FsTrees
    watcher.on('unlink', (path) => registry.remove(path));
    watcher.on('add', (path, source) => registry.addEntry(path, source));
    watcher.on('change', (path, source) => registry.invalidateSource(path, source));

    // Hook Transformer
    commonIFT.on('done', (path, transformIds, source) => registry.addSource(path, transformIds, source));

    // COMMENCE!
    initializer.start();

    if (!watch) {
        let processingCount = 0;
        registry.on('sourceAdded', () => processingCount++);

        registry.on('sourceTransformed', () => {
            processingCount--;

            if (processingCount === 0) {
                debug(`Transform done!`);
                // process.exit(0);
            }
        });
    }
}
