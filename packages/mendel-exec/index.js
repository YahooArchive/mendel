const vm = require('vm');
const path = require('path');
const m = require('module');
const resolve = require('resolve');
// https://github.com/nodejs/node/blob/master/lib/internal/module.js#L54-L60
const builtinLibs = Object.keys(process.binding('natives'));
const _require = require;
const errorMapper = require('./source-mapper');

function runEntryInVM(filename, source, sandbox, require) {
    if (require.cache[filename]) {
        return require.cache[filename].exports;
    }

    const exports = {};
    const module = {exports};
    // Put the cache first so if return something even in the case when
    // cycle of dependencies happen.
    require.cache[filename] = module;

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
    } catch (e) {
        delete require.cache[filename];
        throw e;
    }

    return module.exports;
}

function matchVar(norm, entries, variations, runtime) {
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
            return entry.variation === varId &&
                (
                    entry.runtime === 'isomorphic' ||
                    entry.runtime === runtime ||
                    entry.runtime === 'package'
                );
        });
        if (found) return found;
    }

    throw new RangeError([
        `Could not find entries with norm "${norm}" that matches`,
        `"${JSON.stringify(variations)}"`,
        'in the list of entries',
        `[${entries.map(({id}) => id)}]`,
    ].join(' '));
}

function exec(fileName, source, {sandbox = {}, resolver}) {
    if (!sandbox) sandbox = {};
    if (!sandbox.cache) sandbox.cache = {};
    vm.createContext(sandbox);
    if (!sandbox.global) sandbox.global = sandbox;
    if (!sandbox.process) sandbox.process = require('process');
    if (!sandbox.Buffer) sandbox.Buffer = global.Buffer;
    if (!sandbox.setTimeout) sandbox.setTimeout = global.setTimeout;
    if (!sandbox.clearTimeout) sandbox.clearTimeout = global.clearTimeout;
    if (!sandbox.setInterval) sandbox.setInterval = global.setInterval;
    if (!sandbox.clearInterval) sandbox.clearInterval = global.clearInterval;

    // Let's pipe vm output to stdout this way
    sandbox.console = console;

    function varRequire(parentId, literal) {
        if (builtinLibs.indexOf(literal) >= 0) return _require(literal);
        const entry = resolver(parentId, literal);
        if (entry) {
            return runEntryInVM(entry.id, entry.source, sandbox, varRequire);
        }

        // In such case, it is real node's module.
        const dependencyPath = resolve.sync(literal, {
            basedir: path.dirname(parentId),
        });

        return _require(dependencyPath);
    }
    // We allow API user to use older version of cache if it passes the same
    // instance of sandbox. If not, we create a new one and make it
    // last one exec execution.
    varRequire.cache = sandbox.cache;
    return runEntryInVM(fileName, source, sandbox, varRequire);
}

module.exports = {
    execWithRegistry(registry, mainId, variations, sandbox, runtime='main') {
        function resolve(norm) {
            const entries = registry.getExecutableEntries(norm);
            if (!entries) return null;
            return matchVar(
                norm,
                Array.from(entries.values()),
                variations,
                runtime
            );
        }

        const mainEntry = resolve(mainId);
        if (!mainEntry) return require(mainId);
        try {
            return exec(mainEntry.id, mainEntry.source, {
                sandbox,
                runtime,
                resolver(from, depLiteral) {
                    const parent = registry.getEntry(from);

                    if (!parent.deps[depLiteral])
                        throw new Error('Any form of dynamic require is not supported by Mendel'); // eslint-disable-line max-len

                    let normId = parent.deps[depLiteral][runtime];
                    if (typeof normId === 'object') normId = normId[runtime];

                    // If we get _noop from cache, this depLiteral doesn't exist
                    if (normId === '_noop')
                        throw new Error(`Cannot find ${depLiteral} from ${mainEntry.id}`); // eslint-disable-line max-len

                    return resolve(normId);
                },
            });
        } catch (e) {
            e.stack = errorMapper(e.stack, registry);
            console.log('Error was thrown while evaluating.');
            console.log(e.stack);
            throw e;
        }
    },
    exec,
};
