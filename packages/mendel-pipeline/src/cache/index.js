const path = require('path');
const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');

class MendelCache {
    constructor(config) {
        this._store = new Map();
        this._baseConfig = config.baseConfig;
        this._variations = config.variationConfig.variations;
    }

    getNormalizedId(id) {
        let normalizedId = id;

        const match = variationMatches(this._variations, id);
        if (match && !isNodeModule(id)) {
            const parts = path.parse(match.file);
            if (parts.base === 'package.json' || parts.name === 'index') {
                normalizedId = './' + parts.dir;
            } else {
                // no extension
                normalizedId = './' + path.join(parts.dir, parts.name);
            }
        }

        return normalizedId;
    }

    getVariation(path) {
        const match = variationMatches(this._variations, path);
        if (match) return match.variation.id;
        return false;
    }

    addEntry(id) {
        this._store.set(id, new Entry(id));
        const entry = this._store.get(id);
        entry.variation = this.getVariation(id);
        entry.normalizedId = this.getNormalizedId(id);
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
            dep.browser = dep.browser;
            dep.main = dep.main;
        });

        entry.setDependencies(dependencyMap);
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelCache;
