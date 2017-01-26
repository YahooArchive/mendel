const path = require('path');
const EventEmitter = require('events').EventEmitter;
const verbose = require('debug')('verbose:mendel:cache');

const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');
const RUNTIME = ['main', 'browser'];

class MendelCache extends EventEmitter {
    constructor(config) {
        super();
        this.projectRoot = config.projectRoot;
        this.environment = config.environment;

        this._store = new Map();
        this._normalizedIdToEntryIds = new Map();
        this._moduleAliasMap = new Map();
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
        if (this._packageMap.has(id))
            runtime = this._packageMap.get(id).runtime;
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

    /**
     * Certain project or module creates alias of its dependency
     * using package.json's "browser" property. Since the alias is
     * scope to the project, it cannot use global concept of normalizedId
     * but should use a special mapping. For easier search, we use RegExp
     * and key by "<moduleRoot>/<aliasName>" as key to the alias map.
     * For instance: "./node_modules/superagent/emitter" is one.
     */
    _applyModuleAlias(id, depKey, depObject) {
        const match = id.match(/(.*\/node_modules\/[^\/]+)\/\S+$/);
        if (!match || match.length !== 2) return depObject;
        const key = path.join(match[1], depKey);
        if (!this._moduleAliasMap.has(key)) return depObject;

        if (typeof depObject !== 'object') depObject = {
            main: false,
            browser: false,
        };
        const {to, runtime} = this._moduleAliasMap.get(key);
        depObject[runtime] = to;
        return depObject;
    }

    _handleDependency(oDep) {
        const isPkgModule = !!oDep.packageJson;
        // Gather metadata on package if a package.json was never
        // visited even once.
        if (isPkgModule && this.hasEntry(oDep.packageJson)) return;
        // If oDependency is not added yet,
        isPkgModule && this._requestEntry(oDep.packageJson);
        const isIsomorphic = !oDep.browser || oDep.main === oDep.browser;

        RUNTIME
        // dep can have false as a value in which case indicates not found modules
        .filter(runtime => oDep[runtime])
        .forEach(runtime => {
            const dep = oDep[runtime];
            if (typeof dep === 'string') {
                if (isPkgModule && !isIsomorphic) {
                    const name = path.dirname(oDep.packageJson);
                    !isIsomorphic && name && this._packageMap.set(dep, {
                        mapToId: name,
                        runtime,
                    });
                }

                this._requestEntry(dep);
            } else {
                // This code path when dependency in a runtime
                // contains a mapping of source to another within a module.
                // It often pertains to node modules like superagent.
                // https://github.com/visionmedia/superagent/blob/36ce8782842c2fee402013ff0650d7f8b310e3a7/package.json#L53-L57
                Object.keys(dep)
                .filter(key => dep[key])
                .forEach(fromDep => {
                    const toDep = dep[fromDep];
                    // This is the case where node module mapping exists
                    // but it points to unexisting module.
                    // e.g.,
                    // "browser": {
                    //      "unexisting": "existing"
                    // }
                    // and in the code, `require('unexisting');` should resolve
                    // to `existing`.
                    if (fromDep.indexOf('./') !== 0) {
                        this._moduleAliasMap.set(
                            // Makes something like './node_modules/module'
                            path.join(path.dirname(oDep.packageJson), fromDep),
                            {
                                to: toDep,
                                runtime,
                            }
                        );
                    } else {
                        this._packageMap.set(toDep, {
                            mapToId: this.getNormalizedId(fromDep),
                            runtime,
                        });
                        this._packageMap.set(fromDep, {
                            mapToId: this.getNormalizedId(fromDep),
                            runtime: 'main',
                        });
                    }
                    this._requestEntry(toDep);
                });
            }
        });
    }

    setSource(id, source, deps, map) {
        const entry = this.getEntry(id);
        const normDep = {};

        Object.keys(deps)
        // mod = module name or require literal
        .forEach(mod => {
            const dep = deps[mod] = this._applyModuleAlias(id, mod, deps[mod]);
            this._handleDependency(dep);

            normDep[mod] = {};
            RUNTIME.forEach(runtime => {
                let rtDep = dep[runtime];
                // When we add entries, we add them index them by normalizedId.
                // Because of normalizedId, even in the package.json case where multiple
                // runtimes can point to different sources, we can use normalizedId
                // to map it back, thus, it should be sufficient to use any version of dep
                // to generate normalizedId when we store.
                // The resolver will pick the right runtime entry.
                // main is "false" when depdenecy is a node's core module.
                rtDep = typeof rtDep === 'string' ? rtDep : dep.main;
                normDep[mod][runtime] = this.getNormalizedId(rtDep || mod);
            });
        });

        entry.setSource(source, normDep, map);
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
