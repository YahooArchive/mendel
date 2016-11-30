const BaseStep = require('./step');

class Waiter extends BaseStep {
    /**
     * @param {MendelCache} toolset.cache
     */
    constructor({cache}) {
        super();
        this.waitCount = 0;
        this.cache = cache;
    }

    perform() {
        this.waitCount++;
        if (this.cache.size() > this.waitCount) return;
        // TODO: Once type refactor is done and plan is part of entry instance,
        // it will be safe to add optimization here to emit entries without GST right away before wait condition is met
        this.cache.entries().forEach(({id}) => this.emit('done', {entryId: id}));
    }
}

module.exports = Waiter;
