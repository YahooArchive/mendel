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
        this.cache.on('entryAdded', id => {
            // The reason for setImmediate:
            // There can be a quick succession of adding and source adding
            // if we pushEntryId right away, it will trigger next steps
            // literally immediately without having a chance to add the source.
            setImmediate(() => this.pushEntryId(id));
        });
        this.cache.entries()
            .filter(Boolean)
            .forEach(entry => this.pushEntryId(entry.id));
    }

    pushEntryId(entryId) {
        this.emit('done', {entryId});
    }
}

module.exports = Initialize;
