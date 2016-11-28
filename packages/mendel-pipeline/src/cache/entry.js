class Entry {
    constructor(id) {
        this.id = id;

        // property is filled by cache where they have more context
        this.normalizedId;
        this.variation;

        this.sourceVersions = new Map();
        this.dependents = [];
        this.done = []; // environments array
    }

    setSource(transformIds, source, deps) {
        this.sourceVersions.set(transformIds.join('_'), {source, deps});
    }

    hasSource(transformIds) {
        return this.sourceVersions.has(transformIds.join('_'));
    }

    getSource(transformIds) {
        if (!Array.isArray(transformIds)) {
            throw new Error(`Expected "${transformIds}" to be an array.`);
        }
        return this.sourceVersions.get(transformIds.join('_') || 'raw').source;
    }

    getClosestSource(transformIds) {
        for (let i = transformIds.length; i >= 0; i--) {
            const key = transformIds.slice(0, i).join('_');
            if (this.sourceVersions.has(key)) {
                return {
                    transformIds: key.split('_'),
                    source: this.sourceVersions.get(key).source,
                };
            }
        }

        return {
            transformIds:['raw'],
            source: this.sourceVersions.get('raw').source,
        };
    }

    addDependent(dependent) {
        if (this.dependents.indexOf(dependent) >= 0) return;

        this.dependents.push(dependent);
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

    hasDependency(transformIds) {
        if (!this.sourceVersions.has(transformIds.join('_'))) {
            return false;
        }
        return !!this.sourceVersions.get(transformIds.join('_')).deps;
    }

    getDependency(transformIds) {
        return this.sourceVersions.get(transformIds.join('_')).deps || [];
    }

    reset() {
        this.sourceVersions.clear();
        this.dependents = [];
    }

    // For debugging purposes
    debug() {
        return {
            id: this.id,
            normalizedId: this.normalizedId,
            variation: this.variation,
            dependents: this.dependents,
        };
    }
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

module.exports = Entry;
