const path = require('path');
const {stat, readFile} = require('fs');

class ModuleResolver {
    /**
     * @param {Object} options
     * @param {String} options.basedir
     * @param {String[]} options.envNames
     */
    constructor({
        cwd=process.cwd(),
        basedir=process.cwd(),
        extensions=['.js'],
        envNames=['main'],
    } = {}) {
        this.extensions = extensions;
        this.cwd = cwd;
        // in case basedir is relative, we want to make it relative to the cwd.
        this.basedir = path.resolve(this.cwd, basedir);
        this.envNames = envNames;
    }

    static pStat(filePath) {
        return new Promise((resolve, reject) => {
            stat(filePath, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    }

    static pReadFile(filePath, options={}) {
        return new Promise((resolve, reject) => {
            readFile(filePath, options, (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    }

    /**
     * @param {String} moduleName name of the module to resolve its path
     */
    resolve(moduleName) {
        let promise;

        if (/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[\\\/])/.test(moduleName)) {
            const moduleAbsPath = path.resolve(this.basedir, moduleName);
            promise = this.resolveFile(moduleAbsPath).catch(() => this.resolveDir(moduleAbsPath));
        } else {
            promise = this.resolveNodeModules(moduleName);
        }

        return promise
        // Post process
        .then((deps) => {
            // Make the path relative to the `basedir`.
            Object.keys(deps).forEach((depsKey) => deps[depsKey] = path.relative(this.cwd, deps[depsKey]));
            return deps;
        })
        // Fallback solution: Couldn't find anything - Return the name of the module back.
        .catch(() => this.envNames.reduce((reduced, name) => {
            reduced[name] = moduleName;
            return reduced;
        }, {}));
    }

    _fileExists(filePath) {
        return ModuleResolver.pStat(filePath).then(stat => {
            if (stat.isFile() || stat.isFIFO()) return filePath;
            throw new Error({
                message: `${filePath} is not a File.`,
                code: 'ENOENT',
            });
        });
    }

    resolveFile(moduleName) {
        let promise = this._fileExists(moduleName);

        this.extensions.forEach(ext => {
            promise = promise.catch(() => this._fileExists(moduleName + ext));
        });

        return promise.then(filePath => {
            const reduced = this.envNames.reduce((reduced, name) => {
                reduced[name] = filePath;
                return reduced;
            }, {});
            return reduced;
        });
    }

    resolveDir(moduleName) {
        const packagePath = path.join(moduleName, '/package.json');

        return this.readPackageJson(packagePath)
        .then((pkg) => {
            // Nested package.json is not supported.
            // e.g., ./package.json#main -> ./foo/package.json#main -> ./foo/bar/index.js
            // fallback to `main` in case package.json misses the name required.
            return this.envNames.reduce((reduced, name) => {
                reduced[name] = path.join(moduleName, (pkg[name] || pkg.main));
                return reduced;
            }, {});
        })
        .catch(() => this.resolveFile(path.join(moduleName, 'index')));
    }

    readPackageJson(dirName) {
        return ModuleResolver.pStat(dirName)
        .then(stat => {
            if (stat.isFile()) return ModuleResolver.pReadFile(dirName, 'utf8');
            throw new Error({
                message: `${dirName} does not have package.json as a File.`,
                code: 'ENOENT',
            });
        })
        .then((packageStr) => {
            // if fails to parse, we will hit catch
            return JSON.parse(packageStr);
        });
    }

    resolveNodeModules(moduleName) {
        const nodeModulePaths = this.getPotentialNodeModulePaths(this.basedir);
        console.log(moduleName);

        let promise = Promise.reject();

        nodeModulePaths.forEach((nodeModulePath) => {
            promise = promise.catch(() => {
                return ModuleResolver.pStat(nodeModulePath).then(stat => {
                    if (!stat.isDirectory()) throw new Error({
                        message: `${nodeModulePath} is not a directory.`,
                        code: 'ENOENT',
                    });
                    return this.resolveDir(path.join(nodeModulePath, moduleName));
                });
            });
        });

        return promise;
    }

    // From https://github.com/substack/node-resolve
    getPotentialNodeModulePaths(start) {
        const modules = 'node_modules';

        // ensure that `start` is an absolute path at this point,
        // resolving against the process' current working directory
        start = path.resolve(start);

        let prefix = '/';
        if (/^([A-Za-z]:)/.test(start)) {
            prefix = '';
        } else if (/^\\\\/.test(start)) {
            prefix = '\\\\';
        }

        const splitRe = process.platform === 'win32' ? /[\/\\]/ : /\/+/;
        const parts = start.split(splitRe);

        const dirs = [];
        for (let i = parts.length - 1; i >= 0; i--) {
            if (modules === parts[i]) continue;
            dirs.push(prefix + path.join(path.join.apply(path, parts.slice(0, i + 1)), modules));
        }

        if (process.platform === 'win32'){
            dirs[dirs.length - 1] = dirs[dirs.length - 1].replace(':', ':\\');
        }

        return dirs;
    }
}


module.exports = ModuleResolver;
