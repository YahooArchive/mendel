class Entry {
    constructor(id) {
        this.id = id;

        // property is filled by cache where they have more context
        this.normalizedId;
        this.variation;

        this.rawSource;
        this.source;
        // Transform used for source
        this.transformIds;
        this.map;
        // dependencies
        this.deps;
        this.dependents;
        this.done = []; // environments array

        this.reset();
    }

    // Let's store rawSource
    setSource(source, deps) {
        this.source = source;
        this.deps = deps;

        if (!this.rawSource) this.rawSource = source;
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

    getDependency() {
        return this.deps;
    }

    getTypeForConfig(config) {
        const id = this.id;
        if (isNodeModule(id)) return 'node_modules';

        const type = config.types.find(({glob}) => {
            return glob.filter(({negate}) => !negate).some(g => g.match(id)) &&
                glob.filter(({negate}) => negate).every(g => g.match(id));
        });

        return type ? type.name : 'others';
    }

    reset() {
        this.rawSource = null;
        this.source = null;
        this.map = null;
        this.deps = {};
        this.dependents = [];
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
