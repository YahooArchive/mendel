const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const {resolve: pathResolve} = require('path');
const {readFile} = require('fs');

class FileTreeWatcher extends EventEmitter {
    constructor(registry, {cwd, ignore}) {
        super();

        this.cwd = cwd;
        // Default ignore .dot files.
        this.ignored = (ignore || []).concat([/[\/\\]\./]);

        // file size priority
        this.isInitialized = false;
        this.initialProrityQueue = [];

        this.watcher = new chokidar.FSWatcher({cwd: this.cwd, ignored: this.ignored});
        this.setupWatcher();
    }

    setupWatcher () {
        this.watcher
        .on('change', (path) => {
            readFile(pathResolve(this.cwd, path), 'utf8', (err, source) => {
                this.emit('change', path, source);
            });
        })
        .on('unlink', (path) => {
            this.emit('unlink', path);
        })
        .on('add', (path, stats) => {
            readFile(pathResolve(this.cwd, path), 'utf8', (err, source) => {
                if (!this.isInitialized) {
                    return this.initialProrityQueue.push({source, path, size: stats.size});
                }
                this.emit('add', path, source);
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
    }

    subscribe(path) {
        this.watcher.add(path);
    }

    unsubscribe(path) {
        this.watcher.unwatch(path);
    }
}

module.exports = FileTreeWatcher;
