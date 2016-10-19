const debug = require('debug')('mendel:initialize');

class Initialize {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor(bus, cwd) {
        this.cwd = cwd;
        this.bus = bus;
    }

    start() {
        this.bus.on('sourceAdded', (filePath) => {
            // Since we listen from 'cwd', everything default or initial does not have the prefix ".."
            if (filePath.indexOf('..') === 0) return;

            // Default dependency for set of directories/file in "cwd" are "mendel" so they
            // don't get evicted out of the watch list even if it has no dependent.
            this.bus.get(filePath).then(entry => entry.addDependent('mendel'));
        });

        // Listen to everything in
        this.bus.addToPipeline('.');
    }
}

module.exports = Initialize;
