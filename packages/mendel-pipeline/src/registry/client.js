const Minimatch = require('minimatch').Minimatch;
const path = require('path');

class MendelOutletRegistry {
    constructor(config) {
        this._cache = new Map();
        this._normalizedIdToEntryIds = new Map();
        this._options = config;
        this._numInternalEntries = 1; // Because there is internal noop "module", we need to decrement the size.
        this.clear();
    }

    clear() {
        this._cache.clear();
        // noop module support
        this.addEntry({
            id: './node_modules/_noop',
            normalizedId: '_noop',
            runtime: 'isomorphic',
            source: '',
            variation: this._options.baseConfig.dir,
            map: '',
            deps: {},
        });
    }

    get size() {
        return this._cache.size - this._numInternalEntries;
    }

    hasEntry(id) {
        return this._cache.has(id);
    }

    getEntry(id) {
        if (path.isAbsolute(id)) {
            id = './' + path.relative(process.cwd(), id);
        }
        return this._cache.get(id);
    }

    addEntry(entry) {
        if (!this._normalizedIdToEntryIds.has(entry.normalizedId)) {
            this._normalizedIdToEntryIds.set(entry.normalizedId, new Map());
        }
        this._normalizedIdToEntryIds
            .get(entry.normalizedId)
            .set(entry.id, entry);

        // On client side, dep that resolves to "false" means noop and needs to
        // be bundlded or handled appropriately
        Object.keys(entry.deps)
        .forEach(mod => {
            Object.keys(entry.deps[mod]).forEach(runtime => {
                if (entry.deps[mod][runtime] === false)
                    entry.deps[mod][runtime] = '_noop';
            });
        });
        this._cache.set(entry.id, entry);
    }

    removeEntry(id) {
        const entry = this._cache.get(id);
        this._cache.delete(id);

        const map = this._normalizedIdToEntryIds.get(entry.normalizedId);
        map.delete(id);
        if (map.size === 0) {
            this._normalizedIdToEntryIds.delete(entry.normalizedId);
        }
    }

    getExecutableEntries(normId) {
        const fromMap = this._normalizedIdToEntryIds.get(normId);
        const entries = Array.from(fromMap.entries())
        .filter(([, value]) => {
            const type = this._options.types.get(value.type);
            return type && !type.isResource;
        });

        return new Map(entries);
    }

    getEntriesByGlob(globStrings) {
        globStrings = Array.isArray(globStrings) ? globStrings : [globStrings];
        const globs = globStrings.map(str => {
            const isNegate = str[0] === '!';
            str = isNegate ? str.slice(1) : str;

            const isPadded = this._options.variationConfig.allVariationDirs
                .some(varDir => str.indexOf(varDir) >= 0);
            if (!isPadded)
                str = path.join(this._options.baseConfig.dir, str);
            str = (isNegate ? '!./' : './') + str;
            return new Minimatch(str);
        });
        const positives = globs.filter(({negate}) => !negate);
        const negatives = globs.filter(({negate}) => negate);

        return Array.from(this._cache.keys())
        .filter(id => {
            return positives.some(g => g.match(id)) &&
                negatives.every(g => g.match(id));
        })
        .map(id => this.getEntry(id));
    }

    /**
     * Walks dependency graph of a specific type
     */
    walk(normId, criteria, visitorFunction, _visited=new Set()) {
        const {types, runtime='browser'} = criteria;
        if (_visited.has(normId)) return;
        _visited.add(normId);

        const entryVariations = this._normalizedIdToEntryIds.get(normId);
        if (!entryVariations) {
            // throw new Error(`Entry ${normId} not found in registry`);
            // TODO figure out what to do about missing packages.
            // For instance, there is no shim for 'fs'. However,
            // this is totally valid dependency for server-side case but
            // not in the browser. Figure out what to do in case of missing deps.
            return;
        }

        Array.from(entryVariations.values())
        .filter(entry => {
            if (entry.normalizedId === '_noop') return true;
            if (types.indexOf(entry.type) < 0) return false;
            return entry.runtime === 'isomorphic' ||
                entry.runtime === 'node_modules' ||
                entry.runtime === runtime;
        })
        .some(entry => {
            const isContinue = visitorFunction(entry);

            // If visitor function returns false, stop walking
            if (isContinue === false) return true;

            const allDeps = Object.keys(entry.deps)
            .reduce((reducedDeps, depName) => {
                const dep = entry.deps[depName][runtime];
                reducedDeps.push(dep);
                return reducedDeps;
            }, []).filter(Boolean);

            allDeps.forEach(normId => {
                this.walk(normId, criteria, visitorFunction, _visited);
            });
        });
    }
}

module.exports = MendelOutletRegistry;
