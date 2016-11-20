const path = require('path');
const chokidar = require('chokidar');

class FsWatcher {
    constructor({projectRoot, ignore}, cache) {
        this.cache = cache;
        // Default ignore .dot files.
        this.ignored = (ignore || []).concat([/[\/\\]\./]);

        // file size priority
        this.isInitialized = false;
        this.initialProrityQueue = [];

        this.watcher = new chokidar.FSWatcher({
            cwd: this.projectRoot,
            ignored: this.ignored,
        });

        this.watcher
        .on('change', (path) => {
            path = withPrefix(path);
            this.cache.removeEntry(path);
            this.cache.addEntry(path);
        })
        .on('unlink', (path) => {
            this.cache.removeEntry(withPrefix(path));
        })
        .on('add', (path, stats) => {
            path = withPrefix(path);
            if (!this.isInitialized) {
                this.initialProrityQueue.push({
                    path,
                    size: stats.size,
                });
            } else {
                this.cache.addEntry(path);
            }
        })
        .once('ready', () => {
            this.isInitialized = true;

            this.initialProrityQueue
                .sort(({size: aSize}, {size: bSize}) => bSize - aSize)
                .sort((a, b) => packageJsonSort(b) - packageJsonSort(a))
                .forEach(({path}) => {
                    this.cache.addEntry(path);
                });

            // Cleanup the queue afterwards
            this.initialProrityQueue = [];
        });

        this.cache.on('entryRequested', (path) => {
            // Adding entry upfront avoids filesystem async nature to make hard
            // to track how many files we have in the system
            this.cache.addEntry(path);
            this.subscribe(path);
        });
        this.cache.on('entryRemoved', (path) => this.unsubscribe(path));
    }

    subscribe(path) {
        this.watcher.add(path);
    }

    unsubscribe(path) {
        this.watcher.unwatch(path);
    }
}

function withPrefix(path) {
    if (/^\w[^:]/.test(path)) {
        path = './'+path;
    }
    return path;
}

function packageJsonSort(entry) {
    return path.basename(entry.path) === 'package.json' ? 1 : 0;
}

module.exports = FsWatcher;
