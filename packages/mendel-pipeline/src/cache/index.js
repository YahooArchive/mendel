class Entry {
    constructor(id) {
        this.id = id;
        // Common IFT, Common IFT + additional
        this.sourceVersions = new Map();
        this.dependents = [];
        this.browserDependencies = new Set();
        this.nodeDependencies = new Set();
        this.dependenciesUpToDate = false;
    }

    setSource(transformIds, source) {
        this.sourceVersions.set(transformIds.join('_'), source);
    }

    getSource(transformIds) {
        return this.sourceVersions.get(transformIds.join('_'));
    }

    getClosestSource(transformIds) {
        for (let i = transformIds.length; i >= 0; i--) {
            const key = transformIds.slice(0, i).join('_');
            if (this.sourceVersions.has(key)) {
                return {
                    transformIds: key,
                    source: this.sourceVersions.get(key),
                };
            }
        }

        return {transformIds: null, source: null};
    }

    addDependent(dependent) {
        if (this.dependents.indexOf(dependent) >= 0) return;

        this.dependents.push(dependent);
    }

    setDependencies(nodeDeps, browserDeps) {
        this.dependenciesUpToDate = true;
        nodeDeps.forEach(dep => this.nodeDependencies.set(dep));
        browserDeps.forEach(dep => this.browserDependencies.set(dep));
    }

    reset() {
        this.dependenciesUpToDate = false;
        this.sourceVersions.clear();
        this.dependents = [];
        this.nodeDependencies.reset();
        this.browserDependencies.reset();
    }
}

// We can have different adaptors for this layer. Distrubted cache?
class MendelCache {
    constructor() {
        this._cache = new Map();
    }

    addEntry(id) {
        this._cache.set(id, new Entry(id));
    }

    hasEntry(id) {
        return this._cache.has(id);
    }

    deleteEntry(id) {
        this._cache.delete(id);
    }

    getEntry(id) {
        return this._cache.get(id);
    }

    setDependencies(id, dependencies) {
        const entry = this.getEntry(id);
        const browserDeps = [];
        const nodeDeps = [];

        dependencies.forEach(({browser, main}) => {
            browserDeps.push(this.getEntry(browser));
            nodeDeps.push(this.getEntry(main));
        });

        entry.setDependencies(nodeDeps, browserDeps);
    }
}

module.exports = MendelCache;
