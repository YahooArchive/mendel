const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const {resolve: pathResolve, basename, extname} = require('path');
const {readFile} = require('fs');
const verbose = require('debug')('verbose:mendel:fs');

class FileTreeWatcher extends EventEmitter {
    constructor({registry}, {cwd, ignore, types}) {
        super();

        this._registry = registry;
        this.cwd = cwd;
        // Default ignore .dot files.
        this.ignored = (ignore || []).concat([/[\/\\]\./]);

        // file size priority
        this.isInitialized = false;
        this.initialProrityQueue = [];
        this.sourceExt = new Set();
        Object.keys(types).forEach(typeName => {
            const type = types[typeName];

            if (type.isBinary) return;
            type.extensions.forEach(ext => this.sourceExt.add(ext));
        });

        this.watcher = new chokidar.FSWatcher({cwd: this.cwd, ignored: this.ignored});
        this.watcher
        .on('change', (path) => {
            const encoding = this.sourceExt.has(extname(path)) ? 'utf8' : 'binary';
            readFile(pathResolve(this.cwd, path), encoding, (err, source) => {
                this._registry.remove(path);
                this._registry.addEntry(path, source);
            });
        })
        .on('unlink', (path) => {
            this._registry.remove(path);
        })
        .on('add', (path, stats) => {
            this.emit('add', path);

            const encoding = this.sourceExt.has(extname(path)) ? 'utf8' : 'binary';
            readFile(pathResolve(this.cwd, path), encoding, (err, source) => {
                if (!this.isInitialized) {
                    return this.initialProrityQueue.push({source, path, size: stats.size});
                }
                this._registry.addEntry(path, source);
            });
        })
        .once('ready', () => {
            this.isInitialized = true;

            this.initialProrityQueue = this.initialProrityQueue.sort(({size: aSize}, {size: bSize}) => bSize - aSize);
            this.initialProrityQueue = this.initialProrityQueue.sort((a, b) => packageJsonSort(b) - packageJsonSort(a));
            this.initialProrityQueue.forEach(({source, path}) => {
                this._registry.addEntry(path, source);
            });

            // Cleanup the queue afterwards
            this.initialProrityQueue = [];

            this.emit('ready');
        });

        this._registry.on('directoryAdded', (entry, path) => {
            // No need to watch the file that is already being tracked
            if (entry) return;
            this.subscribe(path);
        });
        this._registry.on('sourceRemoved', (path) => this.watcher.unsubscribe(path));
    }

    emit(eventName, filePath) {
        if (typeof filePath === 'string' ) {
            verbose(eventName, filePath);
        } else {
            verbose(eventName);
        }
        EventEmitter.prototype.emit.apply(this, arguments);
    }

    subscribe(path) {
        this.watcher.add(path);
    }

    unsubscribe(path) {
        this.watcher.unwatch(path);
    }
}

function packageJsonSort(entry) {
    return basename(entry.path) === 'package.json' ? 1 : 0;
}

module.exports = FileTreeWatcher;
