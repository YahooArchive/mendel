const path = require('path');

class Entry {
    constructor(id) {
        this.id = id;
        this.normalizedId;
        this.type;
        this.sourceVersions = new Map();
        this.dependents = [];
        this.dependencies = new Map();
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
                    transformIds: key.split('_'),
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

    setDependencies(deps) {
        this.dependenciesUpToDate = true;
        if (deps instanceof Map) this.dependencies = deps;
        Object.keys(deps).forEach(dependencyLiteral => this.dependencies.set(dependencyLiteral, deps[dependencyLiteral]));
    }

    reset() {
        this.sourceVersions.clear();
        this.dependenciesUpToDate = false;
        this.dependencies.clear();
        this.dependents = [];
    }

    // For debugging purposes
    debug() {
        return {
            id: this.id,
            normalizedId: this.normalizedId,
            variation: this.variation,
            type: this.type,
            dependents: this.dependents,
            dependencies: this.dependencies,
        };
    }
}


function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

class MendelCache {
    constructor(config) {
        this._store = new Map();
        this._config = config;
    }

    get variationalRegex() {
        return new RegExp(`(${this._config.variationsdir}${path.sep}(\\w+)|${this._config.basetree})${path.sep}?`);
    }

    getNormalizedId(id) {
        if (isNodeModule(id)) return id;

        return id.replace(this.variationalRegex, '');
    }

    getType(id) {
        if (isNodeModule(id)) return 'node_modules';

        const extname = path.extname(id);
        if (['.js', '.jsx', '.json'].indexOf(extname) >= 0) return 'source';
        return 'binary';
    }

    addEntry(id) {
        this._store.set(id, new Entry(id));
        const entry = this._store.get(id);
        entry.variation = (id.match(this.variationalRegex)|| [0,0,this._config.base])[2];
        entry.normalizedId = this.getNormalizedId(id);
        entry.type = this.getType(id);
    }

    hasEntry(id) {
        return this._store.has(id);
    }

    deleteEntry(id) {
        this._store.delete(id);
    }

    getEntry(id) {
        return this._store.get(id);
    }

    setDependencies(id, dependencyMap) {
        const entry = this.getEntry(id);

        Object.keys(dependencyMap).forEach(dependencyKey => {
            const dep = dependencyMap[dependencyKey];
            dep.browser = this.getNormalizedId(dep.browser);
            dep.main = this.getNormalizedId(dep.main);
        });

        entry.setDependencies(dependencyMap);
    }
}

module.exports = MendelCache;
