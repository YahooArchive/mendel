/**
 * Independent/Isolated file transform
 */
const MultiProcessMaster = require('../multi-process/base-master');
const path = require('path');
const debug = require('debug')('mendel:transformer:master');

/**
 * Knows how to do all kinds of trasnforms in parallel way
 */
class TransformManager extends MultiProcessMaster {
    constructor({transforms}) {
        super(path.join(__dirname, 'worker.js'), {name: 'transforms'});

        this._transforming = [];
        this._transforms = new Map();
        transforms.forEach(transform => {
            this._transforms.set(transform.id, transform);
        });
    }

    /**
     * @override
     */
    subscribe() {
        return {};
    }

    transform(filename, transformIds, source) {
        debug(`Transforming "${filename}" with [${transformIds}]`);
        const transforms = transformIds.map(id => this._transforms.get(id));
        const existing = this._transforming.find(exist => {
            return filename === exist.filename &&
                transforms.every((transform, index) => {
                    return transform === exist.transforms[index];
                });
        });

        if (!transforms.length) return Promise.resolve({source});
        if (existing) {
            return new Promise((resolve, reject) => {
                existing.additional.push({resolve, reject});
            });
        }

        const descriptor = {filename, transforms, additional: []};
        this._transforming.push(descriptor);
        return this.dispatchJob({
            transforms,
            filename,
            source,
        }).then(result => {
            descriptor.additional.forEach(({resolve}) => resolve(result));
            return result;
        }).catch(error => {
            descriptor.additional.forEach(({reject}) => {
                reject(error);
            });
            throw error;
        });
    }
}

module.exports = TransformManager;
