const BaseStep = require('./step');
const debug = require('debug')('mendel:ist');
const path = require('path');

class IndependentSourceTransform extends BaseStep {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {Transformer} tool.transformer
     * @param {DepsManager} tool.depsResolver
     * @param {Array<String>} config.commonTransformIds
     */
    constructor({registry, transformer, depsResolver}, {types, transforms}) {
        super();

        this._registry = registry;
        this._transformer = transformer;
        this._depsResolver = depsResolver;
        this._extToTransformIds = new Map();
        this._parserExtMap = new Map();

        Object.keys(types).forEach(typeName => {
            const type = types[typeName];
            type.extensions.forEach(ext => {
                const transforms = this._extToTransformIds.get(ext) || [];
                this._extToTransformIds.set(ext, transforms.concat(type.transforms || []));
            });

            if (type.parser) {
                const transform = transforms.find(({id}) => id === type.parser);
                // must be full path by here
                const plugin = require(transform.plugin);

                plugin.extensions.forEach(ext => {
                    this._parserExtMap.set(ext, {
                        id: transform.id,
                        compatible: plugin.compatible,
                    });
                });
            }
        });
    }

    getTransform(filePath) {
        const extname = path.extname(filePath);
        let transformIds = this._extToTransformIds.get(extname) || [];
        let effectiveExt = extname;

        if (this._parserExtMap.has(extname)) {
            // e.g., JSON parsing
            // 1. do all transforms for JSON
            // 2. parse JSON into JS
            // 3. do all JS transforms
            const {id: parserId, compatible} = this._parserExtMap.get(extname);
            transformIds.push(parserId);

            const additionalTransformIds = this._extToTransformIds.get(compatible) || [];
            transformIds = transformIds.concat(additionalTransformIds);

            effectiveExt = compatible;
        }

        return {transformIds, effectiveExt};
    }

    perform(entry) {
        const filePath = entry.id;
        const source = entry.getSource(['raw']);
        const {transformIds, effectiveExt} = this.getTransform(filePath);

        let promise = Promise.resolve();
        if (transformIds.length) {
            promise = promise.then(() => this._transformer.transform(filePath, transformIds, source));
        }

        promise
        .then(({source}) => this._registry.addTransformedSource({filePath, transformIds, effectiveExt, source}))
        .catch((error) => debug(`Errored while transforming ${filePath}: ${error.message}: ${error.stack}`))
        .then(() => this._depsResolver.detect(entry, transformIds))
        .then(({deps}) => {
            Object.keys(deps).map(key => deps[key]).forEach(({browser, main}) => {
                // In case the entry is missing for dependency, time to add them into our pipeline.
                if (!this._registry.hasEntry(browser)) this._registry.addToPipeline(browser);
                if (!this._registry.hasEntry(main)) this._registry.addToPipeline(main);
            });
            this._registry.setDependencies(filePath, deps);
        })
        .then(() => this.emit('done', {entryId: filePath}, transformIds));
    }
}

module.exports = IndependentSourceTransform;
