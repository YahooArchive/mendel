const path = require('path');

class Entry {
    constructor(id) {
        this.id = id;
        this.normalizedId;
        this.type;
        this.effectiveExt = path.extname(id);
        this.sourceVersions = new Map();
        this.dependents = [];
        this.dependencies = new Map();
        this.dependenciesUpToDate = false;
    }

    setSource(transformIds, source) {
        this.sourceVersions.set(transformIds.join('_'), source);
    }

    setEffectiveExt(effectiveExt) {
        this.effectiveExt = effectiveExt;
    }

    getSource(transformIds) {
        if (!Array.isArray(transformIds)) throw new Error(`Expected "${transformIds}" to be an array.`);
        return this.sourceVersions.get(transformIds.join('_') || 'raw');
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

        return {transformIds: null, source: this.sourceVersions.get('raw')};
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
        this._baseConfig = config.baseConfig;
        this._variationConfig = config.variationConfig;

        const variationDirSet = new Set();
        Object.keys(this._variationConfig.variations)
            .filter(varKey => this._variationConfig.variations[varKey])
            .forEach(varKey => {
                this._variationConfig.variations[varKey].forEach(varFolderName => variationDirSet.add(varFolderName));
            });
        const varDirNames = Array.from(variationDirSet.keys());

        this.variationalRegex = new RegExp(`(${varDirNames.map(dirName => `(${dirName})${path.sep}\\w+`).join('|')}|${this._baseConfig.dir})${path.sep}?`);
    }

    getNormalizedId(id) {
        if (isNodeModule(id)) return id;

        // This is wrong WIP
        // return id.replace(this.variationalRegex, '');
        return id;
    }

    getType(id) {
        if (isNodeModule(id)) return 'node_modules';

        const extname = path.extname(id);
        if (['.js', '.jsx', '.json'].indexOf(extname) >= 0) return 'source';
        return 'binary';
    }

    getVariation(path) {
        const variationalMatch = path.match(this.variationalRegex);

        if (!variationalMatch) return this._baseConfig.id;
        return 'still working on it';
    }

    addEntry(id) {
        this._store.set(id, new Entry(id));
        const entry = this._store.get(id);
        entry.variation = this.getVariation(id);
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
