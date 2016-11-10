const chokidar = require('chokidar');
const EventEmitter = require('events').EventEmitter;
const {resolve: pathResolve, basename, extname} = require('path');
const {readFile} = require('fs');
const verbose = require('debug')('verbose:mendel:fs');

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

            if (!this.isInitialized) {
                return this.initialProrityQueue.push({path, size: stats.size});
            }

            this._registry.addEntry(path);
        })
        .once('ready', () => {
            this.isInitialized = true;

            this.initialProrityQueue
                .sort(({size: aSize}, {size: bSize}) => bSize - aSize)
                .sort((a, b) => packageJsonSort(b) - packageJsonSort(a))
                .forEach(({path}) => this._registry.addEntry(path));

            // Cleanup the queue afterwards
            this.initialProrityQueue = [];

            this.emit('ready');
        });

        this._registry.on('entryRequested', (entry, path) => this.subscribe(path));
        this._registry.on('dependenciesAdded', (entry, path) => {
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
