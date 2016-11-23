const BaseStep = require('./step');
const atomicCss = require('mendel-atomic-css');
const EntryProxy = require('../entry-proxy');

class GraphSourceTransform extends BaseStep {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {DepsManager} tool.depsResolver
     */
    constructor({registry, depsResolver}, options) {
        super();

        this._registry = registry;
        this._depsResolver = depsResolver;

        this._typeToGsts = new Map();

        this._transforms = options.transforms;
        options.types.forEach(type => {
            const gsts = type.transforms.filter((transformId) => {
                return this._transforms.find(transformId).kind === 'gst';
            });
            this._typeToGsts.set(type.name, gsts);
        });
    }

    getContext() {
        return {
            addVirtualEntry: ({source, id, deps, originatingEntry}) => {
                // TODO make sure virtual entries can be cleaned up with changes in source entry
                this._registry.addEntry(id);
                this._registry.addTransformedSource({
                    filePath: id,
                    transformIds: ['raw'],
                    source,
                    deps,
                });
            },
            removeEntry: (entry) => {
                this._registry.removeEntry(entry.id);
            },
        };
    }

    done(id) {
        this._processedEntryId.set(id, true);

        // TODO we will have separate pipeline for graph ones on done condition
        if (false) {
            Array.from(this._processedEntryId.keys()).forEach(entryId => {
                this.emit('done', {entryId});
            });
        }
    }

    // this is conforming to the steps API
    perform(entry) {
        this.guy(entry);
    }

    // guy gets called more than once; # of GST times.
    guy(entry) {
        // FIXME: we need to require correct resolved plugin and we need to know the
        // current GST
        const gstChain = this._operatedGst;

        const newGsts = [this._currentGstId].concat(this._operatedGst);
        const nextTransformIds = this._registry.getClosestPlanTransformIds(entry.id, newGsts);
        const prevTransformIds = this._registry.getClosestPlanTransformIds(entry.id, gstChain);
        const proxy = EntryProxy.getFromEntry(entry, prevTransformIds);
        // If no GST is planned for this type, abort.
        // If plugin doesn't want to deal with it, abort.
        if (!nextTransformIds.length || !this._currentGst.predicate(proxy)) {
            return this.done(entry.id);
        }

        this._registry.waitForGraphForPlanIds(entry.id, gstChain)
        .then(dependencies => {
            const proxyDeps = dependencies.map(dep => {
                const transformIds = this._registry.getClosestPlanTransformIds(dep.id, gstChain);
                return EntryProxy.getFromEntry(dep, transformIds);
            });
            const result = this._currentGst.transform(this.getContext(nextTransformIds), proxyDeps);

            if (result && result.source) {
                this._registry.addTransformedSource({
                    filePath: entry.id,
                    transformIds: nextTransformIds,
                    source: result.source,
                    deps: result.deps,
                });
            }
            this.done(entry.id);
        })
        .catch(e => {
            console.log(e.stack);
        });
    }
}

module.exports = GraphSourceTransform;
