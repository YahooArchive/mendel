const path = require('path');
const EventEmitter = require('events').EventEmitter;
const verbose = require('debug')('verbose:mendel:cache');

const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');

class MendelCache extends EventEmitter {
    constructor(config) {
        super();
        this._store = new Map();
        this._baseConfig = config.baseConfig;
        this._variations = config.variationConfig.variations;
    }

    getNormalizedId(id) {
        let normalizedId = id;

        const match = variationMatches(this._variations, id);
        if (match && !isNodeModule(id)) {
            const parts = path.parse(match.file);
            if (parts.base === 'package.json' || parts.name === 'index') {
                normalizedId = './' + parts.dir;
            } else {
                // no extension
                normalizedId = './' + path.join(parts.dir, parts.name);
            }
        }

        return normalizedId;
    }

    getVariation(path) {
        const match = variationMatches(this._variations, path);
        if (match) return match.variation.id;
        return false;
    }

    addEntry(id) {
        if (!this._store.has(id)) {
            const entry = new Entry(id);
            entry.variation = this.getVariation(id);
            entry.normalizedId = this.getNormalizedId(id);
            this._store.set(id, entry);
            this.emit('entryAdded', id);
        }
    }

    requestEntry(id) {
        if (!this._store.has(id)) {
            this.emit('entryRequested', id);
        }
    }

    hasEntry(id) {
        return this._store.has(id);
    }

    removeEntry(id) {
        if (this._store.has(id)) {
            this._store.delete(id);
            this.emit('entryRemoved', id);
        }
    }

    size() {
        return this._store.size;
    }

    entries() {
        return Array.from(this._store.values());
    }

    getEntry(id) {
        return this._store.get(id);
    }

    setDependencies(id, dependencyMap) {
        const entry = this.getEntry(id);

        Object.keys(dependencyMap).forEach(dependencyKey => {
            const dep = dependencyMap[dependencyKey];
            dep.browser = dep.browser;
            dep.main = dep.main;
        });

        entry.setDependencies(dependencyMap);
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
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelCache;
