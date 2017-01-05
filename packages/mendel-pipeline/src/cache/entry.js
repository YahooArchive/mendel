class Entry {
    constructor(id) {
        this.id = id;

        // property is filled by cache where they have more context
        this.normalizedId;
        this.variation;
        this.runtime; // one of 'browser', 'server', 'package', 'isomorphic'
        this.type; // one of the ids of types defined in mendelrc.

        this.rawSource;
        this.rawDeps;
        this.source;
        // Transform used for source
        this.transformIds;
        this.map;
        // dependencies
        this.deps;
        this.dependents;
        this.done; // Boolean that denotes whether all ISTs & GSTs are done

        this.reset();
    }

    // Let's store rawSource
    setSource(source, deps) {
        this.source = source;
        this.deps = deps;

        if (!this.rawSource) {
            this.rawSource = source;
            this.rawDeps = deps;
        }
    }

    hasSource() {
        return !!this.source;
    }

    getSource() {
        return this.source;
    }

    getRawSource() {
        return this.rawSource;
    }

    getRawDeps() {
        return this.rawDeps;
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
        };
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = Entry;
