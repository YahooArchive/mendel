class Entry {
    constructor(id) {
        this.id = id;

        // property is filled by cache where they have more context
        this.normalizedId;
        this.variation;
        this.runtime; // one of 'browser', 'main', 'package', 'isomorphic'
        this.type; // one of the ids of types defined in mendelrc.

        this.istSource;
        this.istDeps;
        this.istMap;
        this.rawSource;
        this.rawDeps;
        this.source;
        // Transform used for source
        this.transformIds;
        this.map;
        // dependencies
        this.deps;
        this.dependents;

        // Whether entry went through upto GST step in pipeline.
        this.done;

        this.reset();
    }

    // Let's store rawSource
    setSource(source, deps, map) {
        this.source = source;
        this.deps = deps;

        if (map) {
            this.map = map;
        }

        if (!this.rawSource) {
            this.rawSource = source;
            this.rawDeps = deps;
        }
    }

    hasSource() {
        return !!this.source;
    }

    getDependency() {
        return this.deps;
    }

    getTypeForConfig(config) {
        const id = this.id;
        if (isNodeModule(id)) return 'node_modules';
        const type = config.types.find(type => type.test(id));
        return type ? type.name : 'others';
    }

    reset() {
        this.rawSource = null;
        this.rawDeps = {};
        this.source = null;
        this.map = null;
        this.deps = {};
        this.dependents = [];
        this.done = false;
    }

    // For debugging purposes
    debug() {
        return {
            id: this.id,
            normalizedId: this.normalizedId,
            variation: this.variation,
            dependents: this.dependents,
            source: this.source,
            deps: this.deps,
            map: this.map,
        };
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = Entry;
