const debug = require('debug')('mendel:initialize');

class Initialize {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor(registry, cwd) {
        this.cwd = cwd;
        this.registry = registry;
    }

    start() {
        this.registry.on('sourceAdded', (filePath) => {
            // Since we listen from 'cwd', everything default or initial does not have the prefix ".."
            if (filePath.indexOf('..') === 0) return;

            // Default dependency for set of directories/file in "cwd" are "mendel" so they
            // don't get evicted out of the watch list even if it has no dependent.
            const entry = this.registry.getEntry(filePath);
            entry.addDependent('mendel');
        });

        // Listen to everything in
        this.registry.addToPipeline('.');
    }
}

module.exports = Initialize;
