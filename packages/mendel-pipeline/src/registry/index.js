const EventEmitter = require('events').EventEmitter;
const MendelCache = require('../cache');
const error = require('debug')('mendel:registry:error');

class MendelRegistry extends EventEmitter {
    constructor() {
        super();

        this._mendelCache = new MendelCache();
    }

    addToPipeline(dirPath) {
        this.emit('dirAdded', dirPath);
    }

    addEntry(filePath, rawSource) {
        this._mendelCache.addEntry(filePath);

        this.emit('sourceAdded', filePath, rawSource);
    }

    addSource(filePath, transformIds, source) {
        if (!this._mendelCache.hasEntry(filePath)) {
            error('Adding a source to a file that is unknown. This should be not possible: ' + filePath);
            this._mendelCache.addEntry(filePath);
        }

        const entry = this._mendelCache.getEntry(filePath);
        entry.setSource(transformIds, source);
        this.emit('sourceTransformed', filePath, transformIds, source);
    }

    invalidateSource(filePath, source) {
        const entry = this._mendelCache.getEntry(filePath);
        entry.reset();
        // Because we invalidated this source, this source has effectively been added
        this.emit('sourceAdded', filePath, source);
    }

    setDependencies(filePath, deps) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.setDependencies(filePath, deps);
        this.emit('dependenciesAdded', filePath);
    }

    invalidateDepedencies(filePath) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        // TODO modify entries and its deps recursively
        this.emit('dependenciesInvalidated', filePath);
    }

    remove(filePath) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.deleteEntry(filePath);

        this.emit('sourceRemoved', filePath);
    }

    getEntry(filePath) {
        return this._mendelCache.getEntry(filePath);
    }

    hasEntry(filePath) {
        return this._mendelCache.hasEntry(filePath);
    }
}

module.exports = MendelRegistry;
