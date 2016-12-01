const BaseStep = require('./step');
const debug = require('debug')('mendel:ist');

class IndependentSourceTransform extends BaseStep {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {Transformer} tool.transformer
     * @param {DepsManager} tool.depsResolver
     */
    constructor({registry, transformer, depsResolver}) {
        super();

        this._registry = registry;
        this._transformer = transformer;
        this._depsResolver = depsResolver;
    }

    perform(entry) {
        const entryId = entry.id;
        const buildPlan = this._registry.getTransformPlans(entry.id);
        const transformIds = buildPlan.ist.ids;
        const source = entry.getRawSource();

        let promise = Promise.resolve({source});
        if (transformIds.length) {
            promise = promise.then(() => this._transformer.transform(entryId, transformIds, source));
        }

        promise
        .then(({source}) => {
            return this._depsResolver.detect(entry.id, source).then(({deps}) => {
                Object.keys(deps).map(key => deps[key]).forEach(({browser, main}) => {
                    // In case the entry is missing for dependency, time to add them into our pipeline.
                    if (!this._registry.hasEntry(browser)) this._registry.addToPipeline(browser);
                    if (!this._registry.hasEntry(main)) this._registry.addToPipeline(main);
                });
                this._registry.addTransformedSource({
                    id: entryId,
                    source,
                    deps,
                });
            });
        })
        .then(() => this.emit('done', {entryId}, transformIds))
        .catch((error) => debug(`Errored while transforming ${entryId}: ${error.message}: ${error.stack}`));
    }
}

module.exports = IndependentSourceTransform;
