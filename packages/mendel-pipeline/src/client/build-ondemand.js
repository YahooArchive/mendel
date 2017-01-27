const BaseClient = require('./base-client');
const Stream = require('stream');
const Bundle = require('../bundles/bundle');

class BuildOnDemand extends BaseClient {
    constructor(options) {
        super(options);

        this._bundles = null;
        this._bundleCache = new Map();
        this._requests = [];
    }

    getCacheKey(bundleId, variations) {
        return `${bundleId}-${variations.join(':')}`;
    }

    build(bundleId, variations) {
        const bundle = this.config.bundles.find(({id}) => id === bundleId);
        if (!bundle) {
            throw new Error(
                `Could not find any bundle id ${bundleId} from mendelrc`
            );
        }

        const key = this.getCacheKey(bundleId, variations);
        if (this._bundleCache.has(key)) {
            return Promise.resolve(this._bundleCache.get(key));
        }

        return new Promise((resolve, reject) => {
            const request = {
                id: bundleId,
                variations,
                promise: {resolve, reject},
            };
            this._requests.push(request);
            if (this.synced) this._perform();
        });
    }

    isSynced() {
        return this.synced;
    }

    _perform() {
        if (!this._bundles) {
            // different from `this.config.bundles` which is configurations only
            // `this._bundles` are actual bundle
            // @see bundles/bundle.js
            this._bundles = this.generators.performAll(
                this.config.bundles.map(opts => new Bundle(opts))
            );
        }

        this._requests.forEach(({id, variations, promise}) => {
            const bundle = this._bundles.find(b => b.id === id);
            Promise.resolve()
            .then(() => this.outlets.perform([bundle], variations))
            .then(([output]) => {
                const key = this.getCacheKey(bundle.id, variations);
                if (output instanceof Stream) {
                    let data = '';
                    output.on('data', (d) => data += d.toString());
                    output.on('end', () => {
                        this._bundleCache.set(key, data);
                    });
                } else {
                    this._bundleCache.set(key, output);
                }
                promise.resolve(output);
            })
            .catch(e => {
                promise.reject(e);
                throw e;
            });
        });
        this._requests = [];
    }

    onSync() {
        this._perform();
    }

    onUnsync() {
        this._bundles = null;
        this._bundleCache.clear();
    }
}

module.exports = BuildOnDemand;
