const vm = require('vm');
const path = require('path');
const m = require('module');
const resolve = require('resolve');
const nodeModuleCache = {};

function isNodeModule(filePath) {
    return filePath.indexOf('node_modules') >= 0;
}

function runEntryInVM(entry, sandbox, require) {
    const {id: filename} = entry;
    const cacheable = isNodeModule(filename);
    if (cacheable && nodeModuleCache[filename]) {
        return nodeModuleCache[filename];
    } else if (require.cache[filename]) {
        return require.cache[filename];
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
            require.bind(null, entry),
            module,
            filename,
            path.dirname(filename)
        );

        if (cacheable) {
            nodeModuleCache[filename] = module.exports;
        } else {
            require.cache[filename] = module.exports;
        }
    } catch (e) {
        console.log('Error was thrown while evaluating.');
        console.log(filename);
        console.log(e.stack);
        throw e;
    }

    return module.exports;
}

function matchVar(entries, variations) {
    // variations are variation configurations based on request.
    // How entries resolve in mutltivariate case is a little bit different
    // from variation inheritance, thus this flattening with a caveat.
    const multiVariations = variations.reduce((reduced, {chain}, index) => {
        if (variations.length === index + 1) return reduced.concat(chain);
        // remove base which is part of every chain
        return reduced.concat(chain.slice(0, chain.length - 1));
    }, []);

    for (let i = 0; i < multiVariations.length; i++) {
        const varId = multiVariations[i];
        const found = entries.find(entry => entry.variation === varId);
        if (found) return found;
    }

    throw new RangeError([
        'Could not find entries that matches',
        variations,
        'in the list of entries',
    ].join(' '));
}

module.exports = function exec(registry, mainId, variations) {
    const sandbox = {process: require('process')};
    vm.createContext(sandbox);

    const mainEntries = registry.getEntriesByNormId(mainId);
    if (!mainEntries || !mainEntries.size) {
        throw new Error(`"${mainId}" is not known id.`);
    }

    function resolver(id) {
        return matchVar(
            Array.from(registry.getEntriesByNormId(id).values()),
            variations
        );
    }

    function localRequire(parent, requireLiteral) {
        const depNormId = parent.deps[requireLiteral];
        const entry = resolver(depNormId);

        if (entry) return runEntryInVM(entry, sandbox, localRequire);

        // In such case, it is real node's module.
        const dependencyPath = resolve.sync(requireLiteral, {
            basedir: path.dirname(parent.id),
        });
        return require(dependencyPath);
    }
    // We need new instance of cache on every exec
    localRequire.cache = {};

    const mainEntry = matchVar(Array.from(mainEntries.values()), variations);
    return runEntryInVM(mainEntry, sandbox, localRequire);
};
