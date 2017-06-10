const path = require('path');
const MultiProcessMaster = require('../multi-process/base-master');
const mendelDeps = require('mendel-deps');

/**
 * Knows how to do all kinds of trasnforms in parallel way
 */
class DepsManager extends MultiProcessMaster {
    /**
     * @param {String} config.projectRoot
     */
    constructor({projectRoot, baseConfig, variationConfig, shim}, mendelCache) {
        // For higher cache hit rate, do not utilize "all cores".
        super(path.join(__dirname, 'worker.js'), {name: 'deps', numWorker: 2});

        this._mendelCache = mendelCache;
        this._projectRoot = projectRoot;
        this._baseConfig = baseConfig;
        this._variationConfig = variationConfig;
        this._shim = shim;

        this._mendelCache.on('entryRemoved', () => {
            this.sendAll('clearCache');
        });
    }

    detect(entryId, source) {
        if (!mendelDeps.isSupported(path.extname(entryId))) {
            // there are no dependency
            return Promise.resolve({id: entryId, deps: {}});
        }


        return this.dispatchJob({
            filePath: entryId,
            source,
            // config properties
            projectRoot: this._projectRoot,
            baseConfig: this._baseConfig,
            variationConfig: this._variationConfig,
        }).then(({filePath, deps}) => this.resolve(filePath, deps));
    }

    resolve(entryId, rawDeps) {
        const deps = Object.assign({}, rawDeps);

        // When a shim is present in one of the deps:
        // main: false so we don't include node packages into Mendel pipeline
        // browser: path to the shim -- this will make pipeline include such shims
        Object.keys(deps)
        .filter(literal => this._shim[literal])
        .forEach(literal => {
            deps[literal] = {
                main: deps[literal].main || this._shim[literal],
                browser: this._shim[literal],
            };
        });

        return {id: entryId, deps};
    }

    /**
     * @override
     */
    subscribe() {
        return {
            has: ({filePath}, sender) => {
                const value = this._mendelCache.hasEntry(filePath);
                sender('has', {value, filePath});
            },
        };
    }
}

module.exports = DepsManager;
