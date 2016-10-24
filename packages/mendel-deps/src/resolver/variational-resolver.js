const ModuleResolver = require('./index');
const path = require('path');

class VariationalModuleResolver extends ModuleResolver {
    constructor(config) {
        super(config);

        // Must be a path relative to the basedir
        this.cwd = config.cwd;
        this.baseVarDir = path.resolve(this.cwd, config.baseVariationDir);
        this.varsDir = path.resolve(this.cwd, config.variationsDir);
    }

    getBasePath(variationalPath) {
        const varNameStrippedPath = path.resolve(this.basedir, variationalPath)
            .replace(new RegExp(`${this.varsDir}${path.sep}\\w+${path.sep}?`), '');
        return path.join(this.baseVarDir, varNameStrippedPath || '.');
    }

    isBasePath(modulePath) {
        return path.resolve(modulePath).indexOf(this.baseVarDir) >= 0;
    }

    resolveFile(modulePath) {
        if (this.isBasePath(modulePath)) return super.resolveFile(modulePath);

        return super.resolveFile(modulePath)
        .catch(() => super.resolveFile(this.getBasePath(modulePath)));
    }

    resolveDir(moduleName) {
        if (this.isBasePath(moduleName)) return super.resolveDir(moduleName);
        const packagePath = path.join(moduleName, '/package.json');
        const baseDirPackagePath = path.join(this.getBasePath(moduleName), '/package.json');

        function processPackageJson(pkg) {
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

                this.envNames.filter(name => !resolves[name]).forEach(name => resolves[name] = resolves.main);

                return resolved;
            });
        }

        return Promise.reject()
        .catch(() => this.readPackageJson(packagePath).then(varPackageJson => processPackageJson.call(this, varPackageJson)))
        .catch(() => this.readPackageJson(baseDirPackagePath).then(basePackageJson => processPackageJson.call(this, basePackageJson)))
        .catch(() => this.resolveFile(path.join(moduleName, 'index')));
    }
}

module.exports = VariationalModuleResolver;
