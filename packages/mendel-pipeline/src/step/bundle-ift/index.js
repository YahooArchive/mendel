const EventEmitter = require('events').EventEmitter;
const debug = require('debug')('mendel:bundle-ift');

class Bundle extends EventEmitter {
    constructor({registry, transformer}, bundleConfig) {
        super();
        this.registry = registry;
        this.transformer = transformer;
        this.transformIds = bundleConfig.transform;

        this.completeDeps = new Set();
        this.pendingDeps = new Set();
        (bundleConfig.entries || []).forEach(entry => this.pendingDeps.add(entry));
        (bundleConfig.require || []).forEach(require => this.pendingDeps.add(require));
    }

    update(id) {
        let promise = Promise.resolve();

        if (this.pendingDeps.has(id)) {
            this.pendingDeps.delete(id);

            const entry = this.registry.getEntry(id);
            Array.from(entry.browserDependencies.values())
                .filter(({id}) => !this.completeDeps.has(id))
                .forEach(({id}) => this.pendingDeps.add(id));
            Array.from(entry.nodeDependencies.values())
                .filter(({id}) => !this.completeDeps.has(id))
                .forEach(({id}) => this.pendingDeps.add(id));

            // the transform is already done for this entry. Move forward.
            if (entry.getSource(this.transformIds)) return;

            const closestSource = entry.getClosestSource(this.transformIds);
            const transformTodo = this.transformIds.slice((closestSource.transformIds || []).length);

            // Skip if bundle IFT is already done.
            if (transformTodo.length) {
                debug(`Transforming ${id} with ${this.transformIds}`);
                promise = promise.then(() => {
                    return this.transformer.transform(
                        id,
                        // needs to change based on browser vs. server
                        this.transformIds.slice((closestSource.transformIds || []).length),
                        closestSource.source
                    );
                }).then(({source}) => {
                    debug(`Transformed ${id} with ${this.transformIds.slice((closestSource.transformIds || []).length)}`);
                    this.registry.addSource(id, this.transformIds, source);
                }).catch(e => {
                    debug(`Transformed ${id} failed. ${e.stack}`);
                });
            }
        }

        promise.then(() => {
            this.completeDeps.add(id);

            // time to schedule next one
        });
    }

    onTransform() {
        if (this.pendingDeps.size === 0) {
            this.emit('done');
        }
    }
}

class BundleIFT extends EventEmitter {
    /**
     * @param {MendelRegistry} tool.registry
     * @param {Transformer} tool.transformer
     * @param {Object} config.bundles
     */
    constructor({registry, transformer}, {bundles}) {
        super();

        const bundleWorker = Object.keys(bundles).map(bundleId => new Bundle({registry, transformer}, bundles[bundleId]));
        registry.on('dependenciesAdded', (filePath) => {
            bundleWorker.forEach(bundle => bundle.update(filePath));
        });

        registry.on('sourceTransformed', (filePath) => {
            bundleWorker.forEach(bundle => bundle.onTransform(filePath));
        });
    }
}

module.exports = BundleIFT;
