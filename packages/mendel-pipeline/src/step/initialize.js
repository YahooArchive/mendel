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
        this.cache.on('entryAdded', id => this.pushEntryId(id));
        this.cache.entries()
            .filter(Boolean)
            .forEach(entry => this.pushEntryId(entry.id));
    }

    pushEntryId(id) {
        this.emit('done', {entryId: id});
    }
}

module.exports = Initialize;
