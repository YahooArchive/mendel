// const debug = require('debug')('mendel:initialize');

class Initialize {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor({registry}, {cwd}) {
        this.cwd = cwd;
        this.registry = registry;
    }

    start() {
        // Listen to everything in cwd
        this.registry.addToPipeline('.');
    }
}

module.exports = Initialize;
