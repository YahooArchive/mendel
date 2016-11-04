const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const {resolve: pathResolve} = require('path');
const {readFile} = require('fs');

class FileTreeWatcher extends EventEmitter {
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
            readFile(pathResolve(this.cwd, path), 'utf8', (err, source) => {
                this._registry.remove(path);
                this._registry.addEntry(path, source);
            });
        })
        .on('unlink', (path) => {
            this._registry.remove(path);
        })
        .on('add', (path, stats) => {
            readFile(pathResolve(this.cwd, path), 'utf8', (err, source) => {
                if (!this.isInitialized) {
                    return this.initialProrityQueue.push({source, path, size: stats.size});
                }
                // this.emit('add', path, source);
                this._registry.addEntry(path, source);
            });
        })
        .once('ready', () => {
            this.isInitialized = true;

            this.initialProrityQueue.sort(({size: aSize}, {size: bSize}) => bSize - aSize);
            this.initialProrityQueue.forEach(({source, path}) => this.emit('add', path, source));

            // Cleanup the queue afterwards
            this.initialProrityQueue = [];

            this.emit('ready');
        });

        this._registry.on('dependenciesAdded', (entry, path) => {
            // No need to watch the file that is already being tracked
            if (entry) return;
            this.subscribe(path);
        });
        this._registry.on('sourceRemoved', (path) => this.watcher.unsubscribe(path));
    }

    subscribe(path) {
        this.watcher.add(path);
    }

    unsubscribe(path) {
        this.watcher.unwatch(path);
    }
}

module.exports = FileTreeWatcher;
