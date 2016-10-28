const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:common-ift');

class CommonIFT extends EventEmitter {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {Transformer} tool.transformer
     * @param {Array<String>} config.commonTransformIds
     */
    constructor({registry, transformer}, {commonTransformIds}) {
        super();

        this._registry = registry;
        this._transformIds = commonTransformIds;
        this._transformer = transformer;

        this._registry.on('sourceAdded', (filePath, rawSource) => this.transform(filePath, rawSource));
    }

    transform(filePath, source) {
        this._transformer.transform(filePath, this._transformIds, source)
        .then(({source}) => {
            this.emit('done', filePath, this._transformIds, source);
        })
        .catch((error) => {
            debug(`Errored while transforming ${filePath}: ${error.message}: ${error.stack}`);
        });
    }
}

module.exports = CommonIFT;
