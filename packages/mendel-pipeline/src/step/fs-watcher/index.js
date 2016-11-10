const BaseStep = require('../step');
const chokidar = require('chokidar');
const path = require('path');

class FsWatcher extends BaseStep {
    constructor({registry}, {cwd, ignore}) {
        super();

        this._registry = registry;
        this.cwd = cwd;
        // Default ignore .dot files.
        this.ignored = (ignore || []).concat([/[\/\\]\./]);

        // file size priority
        this.isInitialized = false;
        this.initialProrityQueue = [];

        this.watcher = new chokidar.FSWatcher({cwd: this.cwd, ignored: this.ignored});
        this.watcher
        .on('change', (path) => {
            this._registry.remove(path);
            this._registry.addEntry(path);
            this.emit('done', {entryId: path});
        })
        .on('unlink', (path) => {
            this._registry.remove(path);
        })
        .on('add', (path, stats) => {
            if (!this.isInitialized) return this.initialProrityQueue.push({path, size: stats.size});

            this._registry.addEntry(path);
            this.emit('done', {entryId: path});
        })
        .once('ready', () => {
            this.isInitialized = true;

            this.initialProrityQueue
                .sort(({size: aSize}, {size: bSize}) => bSize - aSize)
                .sort((a, b) => packageJsonSort(b) - packageJsonSort(a))
                .forEach(({path}) => {
                    this._registry.addEntry(path);
                    this.emit('done', {entryId: path});
                });

            // Cleanup the queue afterwards
            this.initialProrityQueue = [];
        });

        this._registry.on('entryRequested', (entry, path) => this.subscribe(path));
        this._registry.on('entryRemoved', (path) => this.watcher.unsubscribe(path));
    }

    subscribe(path) {
        this.watcher.add(path);
    }

    unsubscribe(path) {
        this.watcher.unwatch(path);
    }
}

function packageJsonSort(entry) {
    return path.basename(entry.path) === 'package.json' ? 1 : 0;
}

module.exports = FsWatcher;
