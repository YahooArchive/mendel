const BaseStep = require('../step');
const EntryProxy = require('../../entry-proxy');
const analyze = require('../../helpers/analytics/analytics')('gst');

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
    constructor({registry, cache}, options) {
        super();

        this._cache = cache;
        this._registry = registry;
        this._baseVariationId = options.baseConfig.id;
        this._variations = options.variationConfig.variations;

        this._gsts = [];
        this._transforms = options.transforms;
        options.types.forEach(type => {
            const gsts = type.transforms.filter((transformId) => {
                const transform = this._transforms.find(({id}) => id === transformId);
                return transform && transform.mode === 'gst';
            });
            this._gsts = this._gsts.concat(gsts);
        });
        this._curGstIndex = 0;
        this._processed = new Set();
        this._virtual = new Set();
        this.clear();
        this._cache.on('entryRemoved', () => this.clear());
    }

    clear() {
        this._curGstIndex = 0;
        this._processed.clear();

        this._virtual.forEach(entryId => this._registry.removeEntry(entryId));
        this._virtual.clear();
        this._canceled = true;
    }

    addTransform({id, source='', map='', deps={}}) {
        // This will add source to the "rawSource" so it does not have to
        // go through fs-reader (which should fail as it can be a virtual entry)
        this._registry.addTransformedSource({id, source, deps, map});
    }

    getContext() {
        return {
            addVirtualEntry: ({source, id, map}) => {
                this._virtual.add(id);
                // TODO make sure virtual entries can be cleaned up with changes in source entry
                this.addTransform({id, source, map});
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
        this._canceled = false;
        if (this._gsts.length <= this._curGstIndex || isNodeModule(entry.id))
            return this.gstDone(entry);

        this.performHelper(entry);
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

    performHelper(entry) {
        const proxy = EntryProxy.getFromEntry(entry);
        const currentGstConfig = this._transforms.find(({id}) => id === this._gsts[this._curGstIndex]);
        const currentGst = require(currentGstConfig.plugin);

        // If no GST is planned for this type, abort.
        // If plugin doesn't want to deal with it, abort.
        if (this._processed.has(entry.id) || this._virtual.has(entry.id) || !currentGst.predicate(proxy)) {
            return this.gstDone(entry);
        }

        const graph = this._registry.getDependencyGraph(entry.normalizedId, (depEntry) => {
            // In fs-change case, we can start over from the ist and
            // "deps" can be wrong. We want the ist version in such case.
            const dependecyMap = this._curGstIndex === 0 ?
                depEntry.istDeps : depEntry.deps;
            return Object.keys(dependecyMap).map(literal => {
                // FIXME GST can be difference for main and browser.
                // The difference can lead to different SHA if done poorly.
                // Currently, we just apply main version but browser version
                // may be needed. Address this.
                return dependecyMap[literal].main;
            });
        });

        this.explorePermutation(graph, (chain, variation) => {
            const [main] = chain;
            // We need to create proxy for limiting API surface for plugin writers.
            const context = this.getContext();
            const chainProxy = chain
                .filter(Boolean)
                .map(dep => EntryProxy.getFromEntry(dep));
            const [proxiedMain] = chainProxy;
            proxiedMain.filename = convertVariationalPath(
                this._variations,
                main.id,
                variation
            );

            Promise.resolve()
            .then(analyze.tic.bind(analyze, currentGstConfig.id))
            .then(() => {
                return currentGst.transform(
                    chainProxy,
                    currentGstConfig,
                    context
                );
            })
            .then(analyze.toc.bind(analyze, currentGstConfig.id))
            .then(result => {
                if (this._canceled) return;
                if (result && result.source) {
                    if (main.variation === variation) {
                        this.addTransform({
                            id: proxiedMain.filename,
                            source: result.source,
                            map: result.map,
                            deps: result.deps,
                        });
                    } else {
                        context.addVirtualEntry({
                            id: proxiedMain.filename,
                            originatingEntry: entry,
                            source: result.source,
                            deps: result.deps,
                        });
                    }
                }
                this.gstDone(main);
            })
            .catch(error => {
                error.message = `Errored while transforming ${main.id}:\n` + error.message;
                this.emit('error', {error, id: main.id});
            });
        });
    }
}

module.exports = GraphSourceTransform;
