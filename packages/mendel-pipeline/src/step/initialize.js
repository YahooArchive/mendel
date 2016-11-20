const BaseStep = require('./step');

class Initialize extends BaseStep {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor({cache}) {
        super();
        this.cache = cache;
    }

    start() {
        this.cache.on('entryAdded', id => this.pushEntry(id));
        this.cache.entries().forEach(id => this.pushEntry(id));
    }

    pushEntry(entryId) {
        this.emit('done', {entryId: entryId});
    }
}

module.exports = Initialize;
