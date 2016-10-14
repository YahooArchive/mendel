const FsTree = require('./fs-tree');
const IftManager = require('./ift');
const debug = require('debug')('mendel');

module.exports = MendelPipeline;

function MendelPipeline(targetCwd, {
    transforms,
    watch=false,
    ignore=['_ignore_'],
}, callback) {
    if (!transforms) {
        throw new Error('`transforms` field is required.');
    }

    const treeWatcher = new FsTree(targetCwd, {ignore});
    const iftManager = new IftManager(transforms);

    treeWatcher.on('unlink', (path) => {
        // remove `path` from cache
    });
    treeWatcher.on('add', (path, source) => {
        iftManager.transform(path, source);
    });
    treeWatcher.on('change', (path, source) => {
        iftManager.transform(path, source);
    });
    iftManager.on('transformed', (filename, source) => {
        // TODO
        // start next process with transformed source
    });


    if (!watch) {
        let fsReady = false;
        let fileCount = 0;
        let processedFileCount = 0;
        const transformed = new Map();

        treeWatcher.on('add', () => fileCount++);
        treeWatcher.once('ready', () => fsReady = true);
        iftManager.on('transformed', (filename, source) => {
            transformed.set(filename, source);
            processedFileCount++;

            if (fsReady && processedFileCount === fileCount) {
                if (callback) callback(transformed);
                else process.exit(0);
            }
        });
    }
}
