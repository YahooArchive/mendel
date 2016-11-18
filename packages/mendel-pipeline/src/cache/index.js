const path = require('path');
const Entry = require('./entry.js');
const variationMatches = require('mendel-development/variation-matches');

class MendelCache {
    constructor(config) {
        this._store = new Map();
        this._baseConfig = config.baseConfig;
        this._variations = config.variationConfig.variations;

        // Parser can map a type to another type
        this._parserTypeConversion = new Map();

        const {types, transforms} = config;
        this._transforms = transforms;
        this._types = types;
        this._types.forEach(type => {
            if (!type.parser || !type.parserToType) return;
            // TODO better cycle detection: cannot have cycle
            if (type.parserToType === type.name) return;
            this._parserTypeConversion.set(type.name, type.parserToType);
        });
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

    // ⚠️ TODO This can change based on environment
    getType(id) {
        if (isNodeModule(id)) return 'node_modules';

        const type = this._types.find(({glob}) => {
            return glob.filter(({negate}) => !negate).some(g => g.match(id)) &&
                glob.filter(({negate}) => negate).every(g => g.match(id));
        });

        return type ? type.name : 'others';
    }

    getTransformIdsByType(typeName) {
        const type = this._types.find(({name}) => typeName === name);
        if (!type) return [];
        if (!this._parserTypeConversion.has(typeName)) {
            return type.transforms;
        }

        return type.transforms.concat([type.parser]);
    }

    getTransformPlans(entryId) {
        // do ist first
        const type = this.getType(entryId);
        const ist = {
            type: this.getType(entryId),
            ids: ['raw'].concat(this.getTransformIdsByType(type)),
        };
        const gst = {};

        while (this._parserTypeConversion.has(ist.type)) {
            const newType = this._parserTypeConversion.get(ist.type);
            ist.type = newType;
            ist.ids = ist.ids.concat(this.getTransformIdsByType(ist.type));
        }

        // `ist.ids` can contain GST because they are mixed in declaration
        const gsts = ist.ids.filter(transformId => {
            const transform = this._transforms.find(({id}) => transformId === id);
            return transform && transform.kind !== 'ist';
        });

        // remove the gsts
        ist.ids = ist.ids.slice(0, ist.ids.length - gsts.length);

        let prevPlan = ist;
        gsts.forEach(gstId => {
            gst[gstId] = {
                // can there be a type conversion with a gst?
                type: ist.type,
                ids: prevPlan.ids.concat([gstId]),
            };
            prevPlan = gst[gstId];
        });

        return {
            ist,
            gst,
        };
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
        entry.buildPlan = this.getTransformPlans(id);
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
