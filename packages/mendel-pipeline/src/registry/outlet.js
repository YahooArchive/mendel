const Minimatch = require('minimatch').Minimatch;
const path = require('path');

class MendelOutletRegistry {
    constructor(options) {
        this._cache = new Map();
        this._normalizedIdToEntryIds = new Map();
        this._options = options;
    }

    get size() {
        return this._cache.size;
    }

    hasEntry(id) {
        return this._cache.has(id);
    }

    getEntry(id) {
        return this._cache.get(id);
    }

    addEntry(entry) {
        if (!this._normalizedIdToEntryIds.has(entry.normalizedId)) {
            this._normalizedIdToEntryIds.set(entry.normalizedId, new Map());
        }
        this._normalizedIdToEntryIds
            .get(entry.normalizedId)
            .set(entry.id, entry);

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

    getEntriesByNormId(normId) {
        return this._normalizedIdToEntryIds.get(normId);
    }

    getEntriesByGlob(globStrings) {
        const globs = globStrings.map(str => {
            const isNegate = str[0] === '!';
            str = isNegate ? str.slice(1) : str;
            str = path.join(this._options.baseConfig.dir, str);
            str = (isNegate ? '!./' : './') + str;
            return new Minimatch(str);
        });

        return Array.from(this._cache.keys())
        .filter(id => {
            return globs.filter(({negate}) => !negate).some(g => g.match(id)) &&
                globs.filter(({negate}) => negate).every(g => g.match(id));
        })
        .map(id => this.getEntry(id));
    }

    /**
     * Walks dependency graph of a specific type
     */
    walk(normId, types, visitorFunction, _visited=new Set()) {
        if (_visited.has(normId)) return;
        _visited.add(normId);

        const entryVariations = this.getEntriesByNormId(normId);
        if (!entryVariations) {
            // throw new Error(`Entry ${normId} not found in registry`);
            // TODO figure out what to do about missing packages.
            // For instance, there is no shim for 'fs'. However,
            // this is totally valid dependency for server-side case but
            // not in the browser. Figure out what to do in case of missing deps.
            return;
        }

        Array.from(entryVariations.values())
        .filter(entry => types.indexOf(entry.type) >= 0)
        .some(entry => {
            const isContinue = visitorFunction(entry);

            // If visitor function returns false, stop walking
            if (isContinue === false) return true;

            const allDeps = Object.keys(entry.deps)
                .reduce((reducedDeps, depName) => {
                    const dep = entry.deps[depName];
                    reducedDeps.push(dep);
                    return reducedDeps;
                }, []);

            allDeps.filter(Boolean).forEach(normId => {
                this.walk(normId, types, visitorFunction, _visited);
            });
        });
    }
}

module.exports = MendelOutletRegistry;
