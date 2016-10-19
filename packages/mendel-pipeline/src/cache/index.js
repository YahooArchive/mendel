class Entry {
    constructor(filePath) {
        this.filePath = filePath;
        // Common IFT, Common IFT + additional
        this.sourceVersions = new Map();
        this.dependents = [];
        this.dependencies = [];
    }

    setSource(transformIds, source) {
        this.sourceVersions.set(transformIds.join('_'), source);
    }

    addDependent(dependent) {
        if (this.dependents.indexOf(dependent) >= 0) return;

        this.dependents.push(dependent);
    }

    reset() {
        this.sourceVersions.clear();
        this.dependents = [];
        this.dependencies = [];
    }
}

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

    get(filePath) {
        // NOTE this function can be async when using memcached or whatever
        return Promise.resolve(this._cache.get(filePath));
    }
}

module.exports = MendelCache;
