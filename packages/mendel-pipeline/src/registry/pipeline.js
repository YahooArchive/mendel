const EventEmitter = require('events').EventEmitter;
// const error = require('debug')('mendel:registry:error');
const verbose = require('debug')('verbose:mendel:registry');

class MendelRegistry extends EventEmitter {
    constructor(config, cache) {
        super();

        this._mendelCache = cache;

        // Parser can map a type to another type
        this._parserTypeConversion = new Map();

        const {types, transforms} = config;
        this._transforms = [{id: 'raw', mode: 'ist'}].concat(transforms);
        this._types = types;
        this._types.forEach(type => {
            if (!type.parser || !type.parserToType) return;
            // TODO better cycle detection: cannot have cycle
            if (type.parserToType === type.name) return;
            this._parserTypeConversion.set(type.name, type.parserToType);
        });
    }

    emit(eventName, entry) {
        if (entry && entry.id) {
            verbose(eventName, entry.id);
        } else if(entry) {
            verbose(eventName, entry);
        } else {
            verbose(eventName);
        }
        super.emit.apply(this, arguments);
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

    // planSearchIds is in order of priority
    getClosestPlanTransformIds(entryId, planSearchIds) {
        const plan = this.getTransformPlans(entryId);
        const foundPlan = planSearchIds.reverse().find(id => plan[id]);
        if (!foundPlan) return [];
        return plan[foundPlan].ids;
    }

    getTransformPlans(entryId) {
        // do ist first
        const type = this.getType(entryId);
        const ist = {
            type: this.getType(entryId),
            ids: [],
        };
        const gst = {};
        let xformIds = this.getTransformIdsByType(type);

        // If there is a parser, do type conversion
        while (this._parserTypeConversion.has(ist.type)) {
            const newType = this._parserTypeConversion.get(ist.type);
            ist.type = newType;
            xformIds = xformIds.concat(this.getTransformIdsByType(ist.type));
        }

        const xforms = xformIds
        .map(transformId => this._transforms.find(({id}) => transformId === id))
        .filter(Boolean);

        ist.ids = xforms.filter(xform => xform.mode === 'ist').map(xform => xform.id);
        const gstIds = xforms.filter(xform => xform.mode === 'gst').map(xform => xform.id);

        let prevPlan = ist;
        gstIds.forEach(gstId => {
            gst[gstId] = {
                // can there be a type conversion with a gst?
                type: ist.type,
                ids: prevPlan.ids.concat([gstId]),
            };
            prevPlan = gst[gstId];
        });

        return Object.assign(gst, {ist});
    }

    addToPipeline(filePath) {
        this._mendelCache.requestEntry(filePath);
    }

    addEntry(filePath) {
        this._mendelCache.addEntry(filePath);
    }

    addSource({id, source, deps}) {
        if (!this._mendelCache.hasEntry(id)) {
            this._mendelCache.addEntry(id);
        }
        this._mendelCache.setSource(id, source, deps);
    }

    addTransformedSource({id, source, deps}) {
        this.addSource({id, source, deps});
        this.emit('_transformedSource', id);
    }

    invalidateDepedencies(filePath) {
        // TODO modify entries and its deps recursively
        if (!this._mendelCache.hasEntry(filePath)) return;
    }

    doneEntry(filePath, environment) {
        if (!this._mendelCache.hasEntry(filePath)) return;
        this._mendelCache.doneEntry(filePath, environment);
    }

    removeEntry(filePath) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.deleteEntry(filePath);

        // Because Entry is deleted, we don't really dispatch with the Entry
        this.emit('entryRemoved', filePath);
    }

    getEntry(filePath) {
        return this._mendelCache.getEntry(filePath);
    }

    hasEntry(filePath) {
        return this._mendelCache.hasEntry(filePath);
    }

    /**
     * @param {String} norm normalizedId
     * @param {Function} dependencyGetter has to return correct normalizedId of dependency
     *     based on environemnt, transform ids, and settings (browser/main).
     * @returns {Array<Entry[]>} In case a dependency have more than one variation
     *   the Entry[] will have length greater than 1.
     */
    getDependencyGraph(norm, dependencyGetter) {
        const visitedEntries = new Map();
        const unvisitedNorms = [norm];

        while (unvisitedNorms.length) {
            const normId = unvisitedNorms.shift();
            if (visitedEntries.has(normId)) continue;
            const entryIds = this._mendelCache.getEntriesByNormId(normId);
            const entries = entryIds.map(entryId => this.getEntry(entryId));
            entries.forEach(entry => {
                const depNorms = dependencyGetter(entry);
                Array.prototype.push.apply(unvisitedNorms, depNorms);
            });

            visitedEntries.set(normId, entries);
        }

        return Array.from(visitedEntries.values());
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelRegistry;
