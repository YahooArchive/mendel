const path = require('path');
const EventEmitter = require('events').EventEmitter;
const verbose = require('debug')('verbose:mendel:cache');

const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');

class MendelCache extends EventEmitter {
    constructor(config) {
        super();
        this._store = new Map();
        this._normalizedIdToEntryIds = new Map();
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

            if (!this._normalizedIdToEntryIds.has(entry.normalizedId)) {
                this._normalizedIdToEntryIds.set(entry.normalizedId, []);
            }
            this._normalizedIdToEntryIds.get(entry.normalizedId).push(entry.id);

            this._store.set(id, entry);
            this.emit('entryAdded', id);
        }
    }

    doneEntry(id, environment) {
        const entry = this.getEntry(id);
        entry.done.push(environment);
        this.emit('doneEntry', entry);
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

    getEntriesByNormId(normId) {
        return this._normalizedIdToEntryIds.get(normId);
    }

    setSource(id, transformIds, source, deps) {
        const entry = this.getEntry(id);
        const normalizedDeps = {};
        Object.keys(deps).forEach(depLiteral => {
            const depObject = deps[depLiteral];
            const normDep = {};
            normalizedDeps[depLiteral] = normDep;
            Object.keys(depObject).forEach(envName => {
                normDep[envName] = this.getNormalizedId(depObject[envName]);
            });
        });

        entry.setSource(transformIds, source, normalizedDeps);
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

    debug() {
        Array.from(this._store.values()).forEach(entry => {
            console.log(entry.id);
            console.log('  norm: ' + entry.normalizedId);
            console.log('  var: ' + entry.variation);
            console.log('  sources:');
            Array.from(entry.sourceVersions.entries()).forEach(([ids, {deps}]) => {
                console.log(`    ${ids}: ${JSON.stringify(deps)}`);
            });
        });
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelCache;
