const BaseClient = require('./base-client');

class BuildOnDemand extends BaseClient {
    constructor(options) {
        super(options);

        this.bundleCache = [];
        this.entryToBundles = new Map();
        this._requests = [];
    }

    build(bundleId, variation) {
        const bundle = this.options.bundles.find(({id}) => id === bundleId);

        if (this.bundleCache.indexOf(bundle) >= 0) {
            return Promise.resolve(bundle.output);
        }

        return new Promise((resolve, reject) => {
            const request = this._queueRequest(bundle, variation);
            request.promise = {resolve, reject};
           if (this.synced) this._perform();
        });
    }

    _queueRequest(curBundle, variation) {
        // `from` is a special keyword in Mendel config that describes
        // dependency between bundles.
        const froms = (curBundle.options.from || '').split(',');
        froms.forEach(from => {
            // If cache already contains the bundle dependency, then no need to
            // prebuild
            if (this.bundleCache.some(d => d.id === from)) return;

            const requiredBundle = this.bundles.find(b => b.id === from);
            // `from` can point at a bundle that is not declared. Warn and skip
            if (!requiredBundle) {
                console.error([
                    `[WARN] Bundle "${from}" is missing from bundle`,
                    'configuration',
                ].join(' '));
                return;
            }
            // Recursively continue
            this._queueRequest(requiredBundle, variation);
        });

        const request = {
            bundle: curBundle,
            variation,
        };
        this._requests.push(request);
        return request;
    }

    _perform() {
        let chain = Promise.resolve();

        while (this._requests.length > 0) {
            const {bundle, variation, promise} = this._requests.shift();
            chain = chain
            .then(() => this.generators.perform(bundle, this.bundleCache))
            .then(() => {
                // Collect information about currently generated bundle
                if (!bundle.entries) return;
                Array.from(bundle.entries.keys()).forEach(entryId => {
                    if (!this.entryToBundles.has(entryId)) {
                        this.entryToBundles.set(entryId, new Set());
                    }
                    this.entryToBundles.get(entryId).add(bundle.id);
                });
            })
            .then(() => this.outlets.perform([bundle], variation))
            .then(() => promise.resolve(bundle.output))
            .catch(e => {
                promise.reject(e);
                throw e;
            });
        }

        chain
        .then(() => this.emit('done'))
        .catch(e => this.emit('error', e));
    }

    onSync() {
        this._perform();
    }

    onUnsync(entryId) {
        const dependentBundles = this.entryToBundles.get(entryId);

        dependentBundles.forEach(bundleId => {
            const ind = this.bundleCache.findIndex(({id}) => id === bundleId);
            const bundle = this.bundleCache[ind];

            if (bundle.entries) {
                Array.from(bundle.entries.keys()).forEach(entryId => {
                    this.entryToBundles.get(entryId).delete(bundleId);
                });
            }

            this.bundleCache.splice(ind, 1);
        });
    }
}

module.exports = BuildOnDemand;
