// const debug = require('debug')('mendel:initialize');

class Initialize {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor({registry}, {projectRoot, variationConfig}) {
        this.projectRoot = projectRoot;
        this.registry = registry;
        this.allDirs = variationConfig.allDirs;
    }

    start() {
        // Add base and all variations to file watcher
        this.registry.addToPipeline(this.allDirs);
    }
}

module.exports = Initialize;
