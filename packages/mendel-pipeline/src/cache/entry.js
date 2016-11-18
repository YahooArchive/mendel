class Entry {
    constructor(id) {
        this.id = id;
        this.normalizedId;
        this.type;
        this.step = 0;
        this.sourceVersions = new Map();
        this.dependents = [];
    }

    incrementStep() {
        this.step++;
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

    getDependency(transformIds) {
        return this.sourceVersions.get(transformIds.join('_')).deps;
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
            type: this.type,
            dependents: this.dependents,
        };
    }
}

module.exports = Entry;
