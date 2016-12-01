

class MendelOutletRegistry {
    constructor() {
        this._cache = new Map();
        this._normalizedIdToEntryIds = new Map();
    }

    get size() {
        return this._cache.size;
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

    walk(normId, visitorFunction) {
        const entryVariations = this.getEntriesByNormId(normId);
        if (!entryVariations) {
            throw new Error(`Entry ${normId} not found in registry`);
        }

        entryVariations.forEach(entry => {
            const allDeps = Object.keys(entry.deps)
                .reduce((reducedDeps, depName) => {
                    const dep = entry.deps[depName];
                    reducedDeps.push(dep);
                    return reducedDeps;
                }, []);

            allDeps.filter(Boolean).forEach(normId => {
                this.walk(normId, visitorFunction);
            });
            visitorFunction(entry);
        });

    }
}

module.exports = MendelOutletRegistry;
