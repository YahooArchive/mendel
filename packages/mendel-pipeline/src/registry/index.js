const EventEmitter = require('events').EventEmitter;
const MendelCache = require('../cache');
const error = require('debug')('mendel:registry:error');
const verbose = require('debug')('verbose:mendel:registry');

class MendelRegistry extends EventEmitter {
    constructor({cwd, baseConfig, variationConfig}) {
        super();

        this._mendelCache = new MendelCache({cwd, baseConfig, variationConfig});
    }

    emit(eventName, entry) {
        if (entry && entry.id) {
            verbose(eventName, entry.id);
        } else if(entry) {
            verbose(eventName, entry);
        } else {
            verbose(eventName);
        }
        super.emit.apply(this, arguments);
    }

    addToPipeline(path) {
        this.emit('entryRequested', path);
    }

    addEntry(filePath) {
        this._mendelCache.addEntry(filePath);
        this.emit('entryAdded', filePath);
    }

    addRawSource(filePath, source) {
        const entry = this._mendelCache.getEntry(filePath);
        entry.setSource(['raw'], source);
    }

    addTransformedSource({filePath, transformIds, effectiveExt, source}) {
        if (!this._mendelCache.hasEntry(filePath)) {
            const msg = `Adding a source to a file that is unknown.
                              This should be not possible: ${filePath}`;
            error(msg);
            this._mendelCache.addEntry(filePath);
        }

        const entry = this._mendelCache.getEntry(filePath);
        entry.setEffectiveExt(effectiveExt);
        entry.setSource(transformIds, source);
    }

    setDependencies(filePath, deps) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.setDependencies(filePath, deps);
    }

    invalidateDepedencies(filePath) {
        // TODO modify entries and its deps recursively
        if (!this._mendelCache.hasEntry(filePath)) return;
    }

    size() {
        return this._mendelCache._store.size;
    }

    entries() {
        return Array.from(this._mendelCache._store.values());
    }

    remove(filePath) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.deleteEntry(filePath);

        // Because Entry is deleted, we don't really dispatch with the Entry
        this.emit('entryRemoved', filePath);
    }

    getEntry(filePath) {
        return this._mendelCache.getEntry(filePath);
    }

    hasEntry(filePath) {
        return this._mendelCache.hasEntry(filePath);
    }
}

module.exports = MendelRegistry;
