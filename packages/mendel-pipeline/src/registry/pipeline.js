const EventEmitter = require('events').EventEmitter;
const verbose = require('debug')('verbose:mendel:registry');

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

        Object.keys(deps).map(key => deps[key]).forEach(({browser, main}) => {
            // In case the entry is missing for dependency, time to add them into our pipeline.
            if (browser && !this.hasEntry(browser)) this.addToPipeline(browser);
            if (main && !this.hasEntry(main)) this.addToPipeline(main);
        });

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

    setEntryType(entryId, newType) {
        return this._mendelCache.setEntryType(entryId, newType);
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

module.exports = MendelRegistry;
