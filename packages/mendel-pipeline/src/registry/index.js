const EventEmitter = require('events').EventEmitter;
const MendelCache = require('../cache');
const error = require('debug')('mendel:registry:error');
const verbose = require('debug')('verbose:mendel:registry');

class MendelRegistry extends EventEmitter {
    constructor(config) {
        super();

        this._mendelCache = new MendelCache(config);
    }

    emit(eventName) {
        verbose(eventName);
        EventEmitter.prototype.emit.apply(this, arguments);
    }

    addToPipeline(dirPath) {
        this.emit('directoryAdded', null, dirPath);
    }

    addEntry(filePath, rawSource) {
        this._mendelCache.addEntry(filePath, rawSource);
        this.emit('sourceAdded', this._mendelCache.getEntry(filePath));
    }

    addSource(filePath, transformIds, source) {
        if (!this._mendelCache.hasEntry(filePath)) {
            error(`Adding a source to a file that is unknown. This should be not possible: ${filePath}`);
            this._mendelCache.addEntry(filePath, source);
        }

        const entry = this._mendelCache.getEntry(filePath);
        entry.setSource(transformIds, source);
        this.emit('sourceTransformed', entry, transformIds);
    }

    setDependencies(filePath, deps) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.setDependencies(filePath, deps);
        this.emit('dependenciesAdded', this._mendelCache.getEntry(filePath), filePath);
    }

    invalidateDepedencies(filePath) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        // TODO modify entries and its deps recursively
        this.emit('dependenciesInvalidated', this._mendelCache.getEntry(filePath));
    }

    remove(filePath) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.deleteEntry(filePath);

        // Because Entry is deleted, we don't really dispatch with the Entry
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
