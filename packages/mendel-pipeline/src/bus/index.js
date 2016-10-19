const EventEmitter = require('events').EventEmitter;
const MendelCache = require('../cache');
const error = require('debug')('mendel:bus:error');

class MendelBus extends EventEmitter {
    constructor() {
        super();

        this._cache = new MendelCache();
    }

    addToPipeline(dirPath) {
        this.emit('dirAdded', dirPath);
    }

    addEntry(filePath, rawSource) {
        this._cache.addEntry(filePath);

        this.emit('sourceAdded', filePath, rawSource);
    }

    addSource(filePath, transformIds, source) {
        if (!this._cache.hasEntry(filePath)) {
            error('Adding a source to a file that is unknown. This should be not possible: ' + filePath);
            this._cache.addEntry(filePath);
        }

        this._cache.get(filePath)
        .then(entry => {
            entry.setSource(transformIds, source);
            this.emit('sourceTransformed', filePath, transformIds);
        });
    }

    invalidateSource(filePath, source) {
        this._cache.get(filePath)
        .then(entry => {
            entry.reset();
            // Because we invalidated this source, this source has effectively been added
            this.emit('sourceAdded', filePath, source);
        });
    }

    invalidateDepedencies(filePath) {
        if (!this._cache.hasEntry(filePath)) return;

        // TODO modify entries and its deps recursively
        this.emit('depInvalidated', filePath);
    }

    remove(filePath) {
        if (!this._cache.hasEntry(filePath)) return;

        this._cache.deleteEntry(filePath);

        this.emit('sourceRemoved', filePath);
    }

    get(filePath) {
        return this._cache.get(filePath);
    }
}

module.exports = MendelBus;
