const vm = require('vm');
const path = require('path');
const m = require('module');
const resolve = require('resolve');
const nodeModuleCache = {};

function isNodeModule(filePath) {
    return filePath.indexOf('node_modules') >= 0;
}

function runEntryInVM(filename, source, sandbox, require) {
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
        const unshebangedSource = source.replace(/^#!.*\n/, '');
        const nodeSource = vm.runInContext(
            m.wrap(unshebangedSource),
            sandbox,
            {filename}
        );
        // function (exports, require, module, __filename, __dirname)
        nodeSource(
            exports,
            require.bind(null, filename),
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

function matchVar(entries, variations, runtime) {
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
        const found = entries.find(entry => {
            return entry.variation === varId && (
                entry.runtime === 'isomorphic' ||
                entry.runtime === runtime
            );
        });
        if (found) return found;
    }

    throw new RangeError([
        'Could not find entries that matches',
        `"${variations}"`,
        'in the list of entries',
        `[${entries.map(({id}) => id)}]`,
    ].join(' '));
}

function exec(fileName, source, {sandbox = {}, resolver}) {
    if (!sandbox) sandbox = {};
    if (!sandbox.global) sandbox.global = sandbox;
    if (!sandbox.process) sandbox.process = require('process');
    if (!sandbox.cache) sandbox.cache = {};
    vm.createContext(sandbox);
    // Let's pipe vm output to stdout this way
    sandbox.console = console;

    function localRequire(parentId, requireLiteral) {
        const entry = resolver(parentId, requireLiteral);
        if (entry) {
            return runEntryInVM(entry.id, entry.source, sandbox, localRequire);
        }

        // In such case, it is real node's module.
        const dependencyPath = resolve.sync(requireLiteral, {
            basedir: path.dirname(parentId),
        });
        return require(dependencyPath);
    }
    // We allow API user to use older version of cache if it passes the same
    // instance of sandbox. If not, we create a new one and make it
    // last one exec execution.
    localRequire.cache = sandbox.cache;
    return runEntryInVM(fileName, source, sandbox, localRequire);
}

module.exports = {
    execWithRegistry(registry, mainId, variations, sandbox, runtime='main') {
        function resolve(id) {
            const entries = registry.getEntriesByNormId(id);
            if (!entries) return null;
            return matchVar(
                Array.from(entries.values()),
                variations,
                runtime
            );
        }

        const mainEntry = resolve(mainId);
        if (!mainEntry) return require(mainId);
        return exec(mainEntry.id, mainEntry.source, {
            sandbox,
            runtime,
            resolver(from, depLiteral) {
                const parent = registry.getEntry(from);
                let normId = parent.deps[depLiteral];
                if (typeof normId === 'object') normId = normId[runtime];
                return resolve(normId);
            },
        });
    },
    exec,
};
