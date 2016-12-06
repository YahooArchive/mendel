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
        this._runtimeMap = new Map();
        this._baseConfig = config.baseConfig;
        this._variations = config.variationConfig.variations;
        this._shimPathToId = new Map();
        Object.keys(config.shim).forEach(shimId => {
            this._shimPathToId.set(config.shim[shimId], shimId);
            this._shimPathToId.set(shimId, shimId);
        });
    }

    // Please, don't use this function except to calculate package.json maps
    _getBeforePackageJSONNormalizedId(id) {
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

    getNormalizedId(id) {
        // For node's packages and shims, normalizedId will resolve to its respective package name
        if (this._shimPathToId.has(id)) return this._shimPathToId.get(id);

        let normalizedId = this._getBeforePackageJSONNormalizedId(id);
        if (this._packageMap.has(normalizedId)) {
            const map = this._packageMap.get(normalizedId);
            normalizedId = map.mapToId;
            this._runtimeMap.set(id, map.runtime);
        }

        return normalizedId;
    }

    getVariation(path) {
        const match = variationMatches(this._variations, path);
        if (match) return match.variation.id;
        return false;
    }

    addEntry(id) {
        if (this._store.has(id)) return;

        this.handleAsPackageJSON(id);

        const entry = new Entry(id);

        // normalize based on variation and environment
        entry.variation = this.getVariation(id);
        entry.normalizedId = this.getNormalizedId(id);
        entry.runtime = this.getRuntime(id);

        // fast lookup cache per normalized id
        if (!this._normalizedIdToEntryIds.has(entry.normalizedId)) {
            this._normalizedIdToEntryIds.set(entry.normalizedId, []);
        }
        this._normalizedIdToEntryIds.get(entry.normalizedId).push(entry.id);

        // finally
        this._store.set(id, entry);
        this.emit('entryAdded', id);
    }

    handleAsPackageJSON(id) {
        const parts = path.parse(id);
        const packageNormId = this._getBeforePackageJSONNormalizedId(id);
        const pkgPath = path.join(this.projectRoot, id);

        if (parts.base !== 'package.json') return;

        delete require.cache[require.resolve(pkgPath)];
        const pkg = require(pkgPath);

        ['browser', 'main'].filter(key => !!pkg[key]).forEach(runtime => {
            // i.e., `browser: {fromFilePath: toFilePath}` or
            // `browser: {filePath: false}`
            if (typeof pkg[runtime] !== 'string') return;

            const targetNormId = this._getBeforePackageJSONNormalizedId(
                './' + path.join(parts.dir, pkg[runtime])
            );
            this.invariantTwoPackagesSameTarget(packageNormId, targetNormId);
            this._packageMap.set(targetNormId, {
                mapToId: packageNormId,
                runtime: runtime,
            });
        });

        // This is done after invariantTwoPackagesSameTarget because both match
        // but invariantTwoPackagesSameTarget is more useful
        this.invariantNewPackageOldEntry(packageNormId, id);
    }

    invariantNewPackageOldEntry(packageNormId, id) {
        if (this._normalizedIdToEntryIds.has(packageNormId)) {
            /*
              This should only happen in watch mode

              TODO: It is possible to not throw here.

              Mutating entries is not safe, since other async pieces of the
              pipeline might be relying on this files already.

              Here are some hypothesis on how to avoid throwing:
              1. Restart the whole process automatically when this happens
              2. Traverse all decendants from all variations and files from
                 this normalizedId and remove them from the pipeline and
                 traverse all the tree again with the new package.json
            */
            throw new Error([
                `can't process ${id} after the`,
                'following files are in the system:',
                '\n',
                this._normalizedIdToEntryIds.get(packageNormId).join('\n'),
                '\n',
            ].join(' '));
        }
    }

    invariantTwoPackagesSameTarget(packageNormId, targetNormId) {
        const existing = this._packageMap.get(targetNormId);
        if (existing && existing.mapToId !== packageNormId) {
            throw new Error([
                "Invariant: Found 2 `package.json` targeting same normalizedId",
                '\n',
                `${packageNormId} -> ${targetNormId}`,
                `${existing.mapToId} -> ${targetNormId}`,
                '\n',
            ].join(' '));
        }
    }

    getRuntime(id) {
        let runtime = 'isomorphic';
        if (this._runtimeMap.has(id)) {
            runtime = this._runtimeMap.get(id);
        }
        if (path.parse(id).base === 'package.json') runtime = 'package';
        return runtime;
    }

    doneEntry(id) {
        const entry = this.getEntry(id);
        entry.done = true;
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

    setSource(id, source, deps) {
        const entry = this.getEntry(id);
        const normalizedDeps = {};
        Object.keys(deps).forEach(depLiteral => {
            const depObject = deps[depLiteral];
            // Because of normalizedId, even in the package.json case, it should
            // be sufficient to use the main. The resolver will pick the right
            // run-time entry.
            // main is "false" when depdenecy is a node's package.
            normalizedDeps[depLiteral] = this.getNormalizedId(depObject.main || depLiteral);
        });
        entry.setSource(source, normalizedDeps);
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
