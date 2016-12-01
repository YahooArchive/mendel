const BaseStep = require('./step');

class End extends BaseStep {
    constructor({registry}, options) {
        super();
        this.registry = registry;
    }

    perform(entry) {
        this.registry.doneEntry(entry.id);
        this.emit('done', {entryId: entry.id});
    }
}

module.exports = End;
