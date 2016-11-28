const BaseStep = require('./step');
const EntryProxy = require('../entry-proxy');

// TODO pull below out to (variation) helper
function convertVariationalPath(variations, from, toVariationId) {
    const toDir = variations.find(variation => variation.id === toVariationId).dir;
    const pattern = new RegExp(`(${variations.map(variation => variation.dir).join('|')})`);
    return from.replace(pattern, toDir);
}

function isNodeModule(id) {
    return id.indexOf('node_modules') >= 0;
}

class GraphSourceTransform extends BaseStep {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {DepsManager} tool.depsResolver
     */
    constructor({registry, depsResolver, cache}, options) {
        super();

        this._cache = cache;
        this._registry = registry;
        this._baseVariationId = options.baseConfig.id;
        this._variations = options.variationConfig.variations;

        this._gsts = ['ist'];
        this._transforms = options.transforms;
        options.types.forEach(type => {
            const gsts = type.transforms.filter((transformId) => {
                const transform = this._transforms.find(({id}) => id === transformId);
                return transform && transform.mode === 'gst';
            });
            this._gsts = this._gsts.concat(gsts);
        });
        this._curGstIndex = 1;
        this._processed = new Set();
    }

    getContext() {
        return {
            addVirtualEntry: ({source, id, map, originatingEntry}) => {
                // TODO make sure virtual entries can be cleaned up with changes in source entry
                this._registry.addEntry(id);
                this._registry.addTransformedSource({
                    filePath: id,
                    transformIds: ['raw'],
                    source,
                    deps: {}, // do deps before
                });
            },
            removeEntry: (entry) => {
                this._registry.removeEntry(entry.id);
            },
        };
    }

    gstDone(entry) {
        this._processed.add(entry.id);
        if (this._processed.size >= this._cache.size()) {
            this._processed.clear();
            if (++this._curGstIndex >= this._gsts.length) {
                this._cache.entries().forEach(({id}) => {
                    this.emit('done', {entryId: id});
                });
            } else {
                this._cache.entries().forEach(entry => this.performHelper(entry));
            }
        }
    }

    // this is conforming to the steps API
    perform(entry) {
        if (this._gsts.length <= this._curGstIndex || isNodeModule(entry.id)) return this.gstDone(entry);
        this.performHelper(entry);
    }

    performHelper(entry) {
        const prevExec = this._gsts.slice(0, this._curGstIndex);
        const curExec = this._gsts.slice(0, this._curGstIndex + 1);
        const prevTransformIds = this._registry.getClosestPlanTransformIds(entry.id, prevExec);
        const nextTransformIds = this._registry.getClosestPlanTransformIds(entry.id, curExec);
        const proxy = EntryProxy.getFromEntry(entry, prevTransformIds);
        const currentGstConfig = this._transforms.find(({id}) => id === this._gsts[this._curGstIndex]);
        const currentGst = require(currentGstConfig.plugin);

        // If no GST is planned for this type, abort.
        // If plugin doesn't want to deal with it, abort.
        if (this._processed.has(entry.id) || !nextTransformIds.length || !currentGst.predicate(proxy)) {
            return this.gstDone(entry);
        }

        const graph = this._registry.getDependencyGraph(entry.normalizedId, (depEntry) => {
            const xformIds = this._registry.getClosestPlanTransformIds(depEntry.id, prevExec);
            const dependecyMap = depEntry.getDependency(xformIds);
            return Object.keys(dependecyMap).map(literal => {
                // TODO remove the dep property
                return dependecyMap[literal].main;
            });
        });

        this.explorePermutation(graph, (chain, variation) => {
            const [main] = chain;
            this._processed.add(main.id);

            // We need to create proxy for limiting API surface for plugin writers.
            const context = this.getContext(nextTransformIds);
            const chainProxy = chain.map(dep => {
                const transformIds = this._registry.getClosestPlanTransformIds(dep.id, prevExec);
                return EntryProxy.getFromEntry(dep, transformIds);
            });
            const result = currentGst.transform(chainProxy, currentGstConfig, context);
            const [proxiedMain] = chainProxy;
            proxiedMain.id = convertVariationalPath(
                this._variations,
                main.id,
                variation
            );

            if (result && result.source) {
                if (entry.variation === variation) {
                    this._registry.addTransformedSource({
                        filePath: entry.id,
                        transformIds: nextTransformIds,
                        source: result.source,
                        deps: result.deps,
                    });
                } else {
                    context.addVirtualEntry({
                        id: proxiedMain.id,
                        originatingEntry: entry,
                        source: result.source,
                        deps: result.deps,
                    });
                }
            }
            this.gstDone(entry);
        });
    }

    explorePermutation(graph, onPermutation) {
        const configVariations = new Set();
        this._variations.forEach(variation => configVariations.add(variation.id));

        // graph has array of arrays. First, make a pass and gather all variation info
        const variations = new Set();
        graph.forEach(nodes => {
            nodes.forEach(node => {
                variations.add(node.variation);
            });
        });

        Array.from(variations.keys())
        // Filter out undeclared (in config) variations
        .filter(varKey => configVariations.has(varKey))
        // We do not yet support multi-variation.
        .forEach(variation => {
            const chain = graph.map((nodes) => {
                return nodes.find(node => node.variation === variation) ||
                    nodes.find(node => {
                        return node.variation === this._baseVariationId ||
                            node.variation === false;
                    });
            });

            // In case a new entry is introduced in variations without one
            // in the base folder, the main file won't exist.
            // In that case, we should not explore the permutation.
            if (!chain[0]) return;

            onPermutation(chain, variation);
        });
    }
}

module.exports = GraphSourceTransform;
