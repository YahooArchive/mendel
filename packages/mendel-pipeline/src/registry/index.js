const EventEmitter = require('events').EventEmitter;
const error = require('debug')('mendel:registry:error');
const verbose = require('debug')('verbose:mendel:registry');

// TODO: Multipe MendelRegistry per environment, but global cache
class MendelRegistry extends EventEmitter {
    constructor(config, cache) {
        super();

        this._mendelCache = cache;

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

    addToPipeline(filePath) {
        this._mendelCache.requestEntry(filePath);
    }

    addEntry(filePath) {
        this._mendelCache.addEntry(filePath);
        this.emit('entryAdded', filePath);
    }

    addRawSource(filePath, source) {
        const entry = this._mendelCache.getEntry(filePath);
        entry.setSource(['raw'], source);
    }

    addTransformedSource({filePath, transformIds, source}) {
        if (!this._mendelCache.hasEntry(filePath)) {
            const msg = `Adding a source to a file that is unknown.
                              This should be not possible: ${filePath}`;
            error(msg);
            this._mendelCache.addEntry(filePath);
        }

        const entry = this._mendelCache.getEntry(filePath);
        entry.setSource(transformIds, source);
    }

    setDependencies(filePath, deps) {
        if (!this._mendelCache.hasEntry(filePath)) return;

        this._mendelCache.setDependencies(filePath, deps);
    }

    invalidateDepedencies(filePath) {
        // TODO modify entries and its deps recursively
        if (!this._mendelCache.hasEntry(filePath)) return;
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
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = MendelRegistry;
