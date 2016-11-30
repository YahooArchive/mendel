const BaseStep = require('./step');

class Initialize extends BaseStep {
    /**
     * @param {MendelCache} toolset.cache
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

    pushEntryId(entryId) {
        this.emit('done', {entryId});
    }
}

module.exports = Initialize;
