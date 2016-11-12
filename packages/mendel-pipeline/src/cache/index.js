const path = require('path');
const Entry = require('./entry.js');

class MendelCache {
    constructor({cwd, baseConfig, variationConfig}) {
        this._cwd = cwd;
        this._store = new Map();
        this._baseConfig = baseConfig;
        this._variationConfig = variationConfig;

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

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelCache;
