// const debug = require('debug')('mendel:initialize');

class Initialize {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor({registry}, {projectRoot}) {
        this.projectRoot = projectRoot;
        this.registry = registry;
    }

    start() {
        // Listen to everything in projectRoot
        this.registry.addToPipeline('.');
    }
}

module.exports = Initialize;
