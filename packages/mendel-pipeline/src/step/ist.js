const debug = require('debug')('mendel:ist');
const path = require('path');

class IndependentSourceTransform {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {Transformer} tool.transformer
     * @param {Array<String>} config.commonTransformIds
     */
    constructor({registry, transformer}, {types, transforms}) {
        this._registry = registry;
        this._transformer = transformer;
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

        this._registry.on('sourceAdded', (entry) => this.transform(entry.id, entry.getSource(['raw'])));
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

    transform(filePath, source) {
        const {transformIds, effectiveExt} = this.getTransform(filePath);
        if (!transformIds.length) {
            // To notify registry that the trasnform is done
            return this._registry.addTransformedSource({filePath, transformIds, effectiveExt, source});
        }

        this._transformer.transform(filePath, transformIds, source)
        .then(({source}) => this._registry.addTransformedSource({filePath, transformIds, effectiveExt, source}))
        .catch((error) => debug(`Errored while transforming ${filePath}: ${error.message}: ${error.stack}`));
    }
}

module.exports = IndependentSourceTransform;
