const vm = require('vm');
const path = require('path');
const m = require('module');
const resolve = require('resolve');
const nodeModuleCache = {};

function isNodeModule(filePath) {
    return filePath.indexOf('node_modules') >= 0;
}

function runEntryInVM(entry, sandbox, resolver) {
    const {id: filename} = entry;
    const cacheable = isNodeModule(filename);
    if (cacheable && nodeModuleCache[filename]) {
        return nodeModuleCache[filename];
    }

    function localRequire(parent, requireLiteral) {
        const depNormId = parent.deps[requireLiteral];
        const entry = resolver(depNormId);

        if (entry) return runEntryInVM(entry, sandbox, resolver);

        // In such case, it is real node's module.
        const dependencyPath = resolve.sync(requireLiteral, {
            basedir: path.dirname(filename),
        });
        return require(dependencyPath);
    }

    const exports = {};
    const module = {exports};

    // the filename is only necessary for uncaught exception reports to point to the right file
    try {
        const unshebangedSource = entry.source.replace(/^#!.*\n/, '');
        const nodeSource = vm.runInContext(
            m.wrap(unshebangedSource),
            sandbox,
            {filename}
        );
        // function (exports, require, module, __filename, __dirname)
        nodeSource(
            exports,
            localRequire.bind(null, entry),
            module,
            filename,
            path.dirname(filename)
        );

        if (cacheable) {
            nodeModuleCache[filename] = module.exports;
        }
    } catch (e) {
        console.log('Error was thrown while evaluating.');
        console.log(filename);
        console.log(e.stack);
        throw e;
    }

    return module.exports;
}

module.exports = function exec(registry, mainId, variation) {
    const sandbox = {process: require('process')};
    vm.createContext(sandbox);

    const mainEntries = registry.getEntriesByNormId(mainId);
    if (!mainEntries || !mainEntries.size) {
        throw new Error(`"${mainId}" is not known id.`);
    }
    const mainEntry = Array.from(mainEntries.values())
        .find(entry => entry.variation === variation);
    return runEntryInVM(mainEntry, sandbox, (id) => {
        return Array.from(registry.getEntriesByNormId(id).values())
        .find(entry => entry.variation === variation);
    });
};
