const ModuleResolver = require('./index');
const path = require('path');

class VariationalModuleResolver extends ModuleResolver {
    constructor(config) {
        super(config);

        // Must be a path relative to the basedir
        this.cwd = config.cwd;
        this.baseVarDir = path.resolve(this.cwd, config.baseVariationDir);
        this.varsDir = path.resolve(this.cwd, config.variationsDir);
        this.variationChain = config.variations.map(variation => path.resolve(this.varsDir, variation)).concat([this.baseVarDir]);
    }

    // Module id is a path without the variational information
    getModuleId(variationalPath) {
        const varNameStrippedPath = path.resolve(this.basedir, variationalPath)
            .replace(new RegExp(`(${this.varsDir}${path.sep}\\w+|${this.baseVarDir})${path.sep}?`), '');
        return varNameStrippedPath || '.';
    }

    isBasePath(modulePath) {
        return path.resolve(modulePath).indexOf(this.baseVarDir) >= 0;
    }

    resolveFile(modulePath) {
        if (this.isBasePath(modulePath)) return super.resolveFile(modulePath);

        let promise = Promise.reject();
        const moduleId = this.getModuleId(modulePath);

        this.variationChain.forEach(variation => {
            promise = promise.catch(() => super.resolveFile(path.resolve(variation, moduleId)));
        });
        return promise;
    }

    _processPackageJson(moduleName, pkg) {
        // Easy case: package.json was present in the variational directory
        // we won't merge base's and variation's package.json so this package.json
        // MUST contain complete information that resolves perfectly.
        const resolveFiles = this.envNames
            .filter(name => pkg[name])
            .map(name => {
                return this.resolveFile(path.join(moduleName, pkg[name]))
                    // `resolveFile` returns Object with all values the same and that is useless for us.
                    .then(fileResolved => ({name, path: fileResolved[name]}))
                    // Even if file does not resolve, let's not make the promise all fail fast.
                    .catch(() => {});
            });

        return Promise.all(resolveFiles).then(resolves => {
            const resolved = {};
            // for failed case, we returned undefined in the catch above so lets filter that out.
            resolves.filter(Boolean).forEach(({name, path}) => {
                resolved[name] = path;
            });
            this.envNames.filter(name => !resolved[name]).forEach(name => resolved[name] = resolved.main);
            return resolved;
        });
    }

    resolveDir(moduleName) {
        if (this.isBasePath(moduleName)) return super.resolveDir(moduleName);

        const moduleId = this.getModuleId(moduleName);
        let promise = Promise.reject();
        this.variationChain.forEach(variation => {
            const packagePath = path.join(variation, moduleId, '/package.json');
            promise = promise.catch(() => {
                return this.readPackageJson(packagePath).then(varPackageJson => this._processPackageJson(moduleName, varPackageJson));
            });
        });

        return promise.catch(() => this.resolveFile(path.join(moduleName, 'index')));
    }
}

module.exports = VariationalModuleResolver;
