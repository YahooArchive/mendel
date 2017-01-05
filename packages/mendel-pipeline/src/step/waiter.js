const BaseStep = require('./step');

class Waiter extends BaseStep {
    /**
     * @param {MendelCache} toolset.cache
     */
    constructor({cache}) {
        super();
        this.waited = new Set();
        this.cache = cache;

        cache.on('entryRemoved', id => this.waited.delete(id));
    }

    perform(entry) {
        this.waited.add(entry.id);
        this.emit('wait', {entryId: entry.id});
        if (this.cache.size() > this.waited.size) return;
        // TODO: Once type refactor is done and plan is part of entry instance,
        // it will be safe to add optimization here to emit entries without GST
        // right away before wait condition is met
        this.cache.entries().forEach(({id}) => this.emit('done', {entryId: id}));
    }
}

module.exports = Waiter;
