const VariationalModuleResolver = require('./variational-resolver');
const path = require('path');

class CachedBisourceVariationalResolver extends VariationalModuleResolver {
    constructor(options) {
        super(options);

        // Cache has to implement "has" method that returns Boolean when passed
        // a file path
        this.biSourceHas = options.has;
        this._cache = options.cache;
    }

    resolve(moduleName) {
        const cacheKey = CachedBisourceVariationalResolver.isNodeModule(moduleName) ?
            moduleName : path.resolve(this.basedir, moduleName);

        if (this._cache.has(cacheKey))
            return Promise.resolve(this._cache.get(cacheKey));

        return super.resolve(moduleName)
        .then(deps => {
            this._cache.set(cacheKey, deps);
            return deps;
        });
    }

    fileExists(filePath) {
        // If biSourceHas has it, we know for sure it exists.
        // If biSourceHas says no, there is an ambiguity. Check with the FS.
        return Promise.resolve()
        .then(() => this.biSourceHas(filePath))
        .then(result => {
            if (result) return filePath;
            return super.fileExists(filePath);
        });
    }
}

module.exports = CachedBisourceVariationalResolver;
