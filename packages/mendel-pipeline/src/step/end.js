const BaseStep = require('./step');

class End extends BaseStep {
    constructor({registry}, options) {
        super();
        this.registry = registry;
        this.environment = options.environment;
    }

    perform(entry) {
        this.registry.doneEntry(entry.id, this.environment);
        this.emit('done', {entryId: entry.id});
    }
}

module.exports = End;
