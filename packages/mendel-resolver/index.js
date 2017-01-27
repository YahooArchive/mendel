const path = require('path');
const {stat, readFile} = require('fs');
const error = require('debug')('error:mendel-resolver');

function withPrefix(path) {
    if (/^\w[^:]/.test(path)) path = './' + path;
    return path;
}

class ModuleResolver {
    /**
     * @param {Object} options
     * @param {String} options.basedir
     * @param {String[]} options.runtimes
     */
    constructor({
        cwd=process.cwd(),
        basedir=process.cwd(),
        extensions=['.js'],
        runtimes=['main'],
        recordPackageJson=false,
    } = {}) {
        this.extensions = extensions;
        this.cwd = cwd;
        // in case basedir is relative, we want to make it relative to the cwd.
        this.basedir = path.resolve(this.cwd, basedir);
        this.runtimes = runtimes;
        this.recordPackageJson = recordPackageJson;
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

    static isNodeModule(name) {
        return !/^(?:\.\.?(?:\/|$)|\/|([A-Za-z]:)?[\\\/])/.test(name);
    }

    setBaseDir(basedir) {
        this.basedir = path.resolve(this.cwd, basedir);
    }

    /**
     * @param {String} moduleName name of the module to resolve its path
     */
    resolve(moduleName) {
        let promise;
        if (!ModuleResolver.isNodeModule(moduleName)) {
            const moduleAbsPath = path.resolve(this.basedir, moduleName);
            promise = this.resolveFile(moduleAbsPath)
                .catch(() => this.resolveDir(moduleAbsPath));
        } else {
            promise = this.resolveNodeModules(moduleName);
        }

        return promise
        // Post process
        .then((deps) => {
            // Make the path relative to the `basedir`.
            Object.keys(deps)
            .filter(rt => deps[rt])
            .forEach(rt => {
                if (typeof deps[rt] === 'string') {
                    // It can be module name without real path for default
                    // node modules (like "path")
                    if (deps[rt].indexOf('/') < 0) return;
                    deps[rt] = withPrefix(path.relative(this.cwd, deps[rt]));
                } else if (typeof deps[rt] === 'object') {
                    const rtDep = deps[rt];
                    Object.keys(rtDep)
                    .filter(key => rtDep[key])
                    .forEach(depKey => {
                        const newKey = depKey.indexOf('/') < 0 ? depKey :
                            withPrefix(path.relative(this.cwd, depKey));
                        const newValue = rtDep[depKey].indexOf('/') < 0 ?
                            rtDep[depKey] :
                            withPrefix(path.relative(this.cwd, rtDep[depKey]));
                        delete rtDep[depKey];
                        rtDep[newKey] = newValue;
                    });
                }
            });
            return deps;
        })
        .catch((e) => {
            error(e.stack);
            throw new Error(`${moduleName} failed to resolve.`);
        });
    }

    fileExists(filePath) {
        return ModuleResolver.pStat(filePath).then(stat => {
            if (stat.isFile() || stat.isFIFO()) return filePath;
            throw new Error({
                message: `${filePath} is not a File.`,
                code: 'ENOENT',
            });
        });
    }

    resolveFile(moduleName) {
        let promise = this.fileExists(moduleName);
        this.extensions.forEach(ext => {
            promise = promise.catch(() => this.fileExists(moduleName + ext));
        });

        return promise.then(filePath => {
            const reduced = this.runtimes.reduce((reduced, name) => {
                reduced[name] = filePath;
                return reduced;
            }, {});
            return reduced;
        });
    }

    resolveDir(moduleName) {
        return this.resolvePackageJson(moduleName)
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

    resolvePackageJson(moduleName) {
        const packagePath = path.join(moduleName, '/package.json');
        return this.readPackageJson(packagePath)
        .then(pkg => {
            if (this.runtimes.every(name => !pkg[name]))
                throw new Error('package.json without "main"');

            const consider = new Map();
            // A "package.json" can have below data structure
            // {
            //     "main": "./foo",
            //     "browser": {
            //         "./foo": "./bar",
            //         "moduleA": "moduleB",
            //         "./baz": false,
            //         "./abc": "./xyz.js"
            //     }
            // }
            // In case of the main, it should resolve to either "./foo.js" or "./foo/index.js"
            // In case of browser runtime, it should anything that requires "./foo" should map to "./bar.js" or "./bar/index.js"
            this.runtimes.filter(name => pkg[name])
            .forEach(name => {
                if (typeof pkg[name] === 'string') consider.set(pkg[name]);
                else if (typeof pkg[name] === 'object') {
                    Object.keys(pkg[name]).forEach(fromPath => {
                        consider.set(fromPath);
                        consider.set(pkg[name][fromPath]);
                    });
                }
            });
            const furtherPaths = Array.from(consider.keys());
            const furtherResolve = furtherPaths.map(depPath => {
                let promise = this.resolve(path.join(moduleName, depPath));
                if (ModuleResolver.isNodeModule(depPath))
                    promise = promise.catch(() => this.resolve(depPath));
                return promise.catch(() => false);
            });
            return Promise.all(furtherResolve).then(resolves => {
                resolves.forEach((resolved, index) => {
                    consider.set(furtherPaths[index], resolved);
                });
                return {deps: consider, pkg};
            });
        })
        .then(({pkg, deps}) => {
            const resolved = this.runtimes.reduce((reduced, name) => {
                const runtimeVal = pkg[name] || pkg.main;
                if (deps.has(runtimeVal))
                    reduced[name] = deps.get(runtimeVal)[name];
                else if (typeof runtimeVal === 'object') {
                    const obj = reduced[name] = {};
                    Object.keys(runtimeVal).forEach(key => {
                        const val = runtimeVal[key];
                        if (!deps.get(key) && !deps.get(val)) return;
                        if (!deps.get(key) && deps.get(val))
                            return obj[key] = deps.get(val)[name];
                        obj[deps.get(key)[name]] = deps.get(val)[name];
                    });
                }
                return reduced;
            }, {});

            if (this.recordPackageJson) resolved.packageJson = packagePath;
            return resolved;
        });
    }

    resolveNodeModules(moduleName) {
        const nodeModulePaths = this.getPotentialNodeModulePaths(this.basedir);
        let promise = Promise.reject();
        nodeModulePaths.forEach((nodeModulePath) => {
            promise = promise.catch(() => {
                return ModuleResolver.pStat(nodeModulePath).then(stat => {
                    if (!stat.isDirectory()) throw new Error({
                        message: `${nodeModulePath} is not a directory.`,
                        code: 'ENOENT',
                    });

                    const moduleFullPath = path.join(nodeModulePath, moduleName);
                    return this.resolveFile(moduleFullPath)
                    .catch(() => this.resolveDir(moduleFullPath));
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
