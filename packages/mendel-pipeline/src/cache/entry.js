
class Entry {
    constructor(id) {
        this.id = id;
        this.normalizedId;
        this.type;
        this.step = 0;
        this.sourceVersions = new Map();
        this.dependents = [];
        this.dependencies = new Map();
    }

    incrementStep() {
        this.step++;
    }

    setSource(transformIds, source) {
        this.sourceVersions.set(transformIds.join('_'), source);
    }

    getSource(transformIds) {
        if (!Array.isArray(transformIds)) {
            throw new Error(`Expected "${transformIds}" to be an array.`);
        }
        return this.sourceVersions.get(transformIds.join('_') || 'raw');
    }

    getClosestSource(transformIds) {
        for (let i = transformIds.length; i >= 0; i--) {
            const key = transformIds.slice(0, i).join('_');
            if (this.sourceVersions.has(key)) {
                return {
                    transformIds: key.split('_'),
                    source: this.sourceVersions.get(key),
                };
            }
        }

        return {transformIds: null, source: this.sourceVersions.get('raw')};
    }

    addDependent(dependent) {
        if (this.dependents.indexOf(dependent) >= 0) return;

        this.dependents.push(dependent);
    }

    setDependencies(deps) {
        if (deps instanceof Map) this.dependencies = deps;
        Object.keys(deps).forEach(dependencyLiteral => {
            this.dependencies.set(dependencyLiteral, deps[dependencyLiteral]);
        });
    }

    reset() {
        this.sourceVersions.clear();
        this.dependencies.clear();
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
            dependencies: this.dependencies,
        };
    }
}

module.exports = Entry;
