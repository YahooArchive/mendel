const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:common-ift');

class CommonIFT extends EventEmitter {
    /**
     * @param {Array<String>} config.commonTransformIds
     * @param {Transformer} toolset.transformer
     */
    constructor(bus, transformer, {commonTransformIds}) {
        super();

        this._bus = bus;
        this._transformIds = commonTransformIds;
        this._transformer = transformer;
    }

    transform(filePath, source) {
        this._transformer.transform(filePath, this._transformIds, source)
        .then(({source}) => {
            this.emit('done', filePath, this._transformIds, source);
        })
        .catch((error) => {
            debug(`Errored while transforming ${filePath}: ${error.message}`);
        });
    }
}

module.exports = CommonIFT;
