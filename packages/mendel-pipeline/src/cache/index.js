class Entry {
    constructor(filePath) {
        this.filePath = filePath;
        // Common IFT, Common IFT + additional
        this.sourceVersions = new Map();
        this.dependents = [];
        this.dependencies = {browser: [], node: []};
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

        return {
            transformIds: null,
            source: null,
        };
    }

    addDependent(dependent) {
        if (this.dependents.indexOf(dependent) >= 0) return;

        this.dependents.push(dependent);
    }

    setDependencies(dependencies) {
        this.dependenciesUpToDate = true;
        dependencies.forEach(({browser, node}) => {
            this.dependencies.browser.push(browser);
            this.dependencies.node.push(node);
        });
    }

    reset() {
        this.dependenciesUpToDate = false;
        this.sourceVersions.clear();
        this.dependents = [];
        this.dependencies = [];
    }
}

// We can have different adaptors for this layer. Distrubted cache?
class MendelCache {
    constructor() {
        this._cache = new Map();
    }

    addEntry(filePath) {
        this._cache.set(filePath, new Entry(filePath));
    }

    hasEntry(filePath) {
        return this._cache.has(filePath);
    }

    deleteEntry(filePath) {
        this._cache.delete(filePath);
    }

    getEntry(filePath) {
        return this._cache.get(filePath);
    }
}

module.exports = MendelCache;
