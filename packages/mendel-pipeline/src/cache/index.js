const path = require('path');
const EventEmitter = require('events').EventEmitter;
const verbose = require('debug')('verbose:mendel:cache');

const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');

class MendelCache extends EventEmitter {
    constructor(config) {
        super();
        this.projectRoot = config.projectRoot;
        this.environment = config.environment;

        this._store = new Map();
        this._normalizedIdToEntryIds = new Map();
        this._packageMap = new Map();
        this._baseConfig = config.baseConfig;
        this._variations = config.variationConfig.variations;
        this._shimPathToId = new Map();
        Object.keys(config.shim).forEach(shimId => {
            this._shimPathToId.set(config.shim[shimId], shimId);
            this._shimPathToId.set(shimId, shimId);
        });
        this._types = config.types;
    }

    // Get Type only based on the entryId. IST can convert the types.
    getInitialType(id) {
        const nodeModule = isNodeModule(id);
        // Find type as if node module was a source
        if (nodeModule) id = '.' + id.slice(id.indexOf('node_modules') + 12);
        const {name} = this._types.find(t => t.test(id)) || {name: '_others'};
        return {
            type: nodeModule ? 'node_modules' : name,
            // Secondary type: type as if node_modules was a source
            _type: name,
        };
    }

    // Please, don't use this function except to calculate package.json maps
    _getBeforePackageJSONNormalizedId(id) {
        if (isNodeModule(id)) return id;
        let normalizedId = id;
        const match = variationMatches(this._variations, id);
        if (match) {
            const parts = path.parse(match.file);
            // some people like to directly require package.json 😱
            // and we don't want to give back module entry
            if (parts.base === 'package.json') return id;
            if (parts.name === 'index') normalizedId = './' + parts.dir;
            // Strip extension
            else normalizedId = './' + path.join(parts.dir, parts.name);
        }

        return normalizedId;
    }

    getNormalizedId(id) {
        // For node's packages and shims, normalizedId will resolve to its respective package name
        if (this._shimPathToId.has(id)) return this._shimPathToId.get(id);
        if (this._packageMap.has(id)) return this._packageMap.get(id).mapToId;
        return this._getBeforePackageJSONNormalizedId(id);
    }

    getVariation(path) {
        const match = variationMatches(this._variations, path);
        if (match) return match.variation.id;
        return false;
    }

    addEntry(id) {
        if (this.hasEntry(id)) return;

        const entry = new Entry(id);

        // normalize based on variation and environment
        entry.variation = this.getVariation(id);
        entry.normalizedId = this.getNormalizedId(id);
        entry.runtime = this.getRuntime(id);
        const type = this.getInitialType(id);
        entry.type = type.type;
        entry._type = type._type;

        // fast lookup cache per normalized id
        if (!this._normalizedIdToEntryIds.has(entry.normalizedId)) {
            this._normalizedIdToEntryIds.set(entry.normalizedId, []);
        }
        this._normalizedIdToEntryIds.get(entry.normalizedId).push(entry.id);

        // finally
        this._store.set(id, entry);
        this.emit('entryAdded', id);
    }

    invariantTwoPackagesSameTarget(packageNormId, targetNormId) {
        const existing = this._packageMap.get(targetNormId);
        if (existing && existing.mapToId !== packageNormId) {
            throw new Error([
                'Invariant: Found 2 `package.json` targeting same normalizedId',
                '\n',
                `${packageNormId} -> ${targetNormId}`,
                `${existing.mapToId} -> ${targetNormId}`,
                '\n',
            ].join(' '));
        }
    }

    getRuntime(id) {
        let runtime = 'isomorphic';
        if (this._packageMap.has(id)) {
            runtime = this._packageMap.get(id).runtime;
        }
        if (path.parse(id).base === 'package.json') runtime = 'package';
        return runtime;
    }

    doneEntry(id) {
        const entry = this.getEntry(id);
        this.emit('doneEntry', entry);
    }

    _requestEntry(id) {
        if (id && !this.hasEntry(id)) {
            this.emit('entryRequested', id);
        }
    }

    hasEntry(id) {
        return this._store.has(id);
    }

    removeEntry(id) {
        if (this.hasEntry(id)) {
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

    setEntryType(id, newType) {
        if (!this.hasEntry(id)) return;
        const entry = this.getEntry(id);
        entry.type = newType;
    }

    setSource(id, source, deps, map) {
        const entry = this.getEntry(id);
        const normalizedDeps = {};

        Object.keys(deps).forEach(depKey => {
            const dep = deps[depKey];

            // Gather metadata on package if a package.json was never
            // visited even once.
            if (dep.packageJson && !this.hasEntry(dep.packageJson)) {
                // TODO we can shorten it more if we read the package.json and get
                // the name. However, it can collide when multiple version of a
                // smae module is loaded. In such case, we need to dedupe. DO IT.
                const name = path.dirname(dep.packageJson);

                ['browser', 'main']
                .filter(runtime => dep[runtime])
                .forEach(runtime => {
                    const depPath = dep[runtime];
                    this.invariantTwoPackagesSameTarget(name, depPath);
                    this._packageMap.set(depPath, {
                        mapToId: name,
                        runtime,
                    });
                });
            }

            // If dependency is not added yet,
            this._requestEntry(dep.packageJson);
            this._requestEntry(dep.browser);
            if (dep.browser !== dep.main) this._requestEntry(dep.main);

            // Because of normalizedId, even in the package.json case, it should
            // be sufficient to use the main. The resolver will pick the right
            // run-time entry.
            // main is "false" when depdenecy is a node's package.
            normalizedDeps[depKey] = this.getNormalizedId(dep.main || depKey);
        });
        entry.setSource(source, normalizedDeps, map);
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
            console.log(entry.source);
        });
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelCache;
