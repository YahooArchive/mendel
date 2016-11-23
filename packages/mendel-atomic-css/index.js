const vm = require('vm');
const path = require('path');
const m = require('module');
const nodeModuleCache = {};

function isNodeModule(filePath) {
    return filePath.indexOf('node_modules') >= 0;
}

function runEntryInVM(entryProxy, sandbox, resolver) {
    const filename = entryProxy.id;
    const cacheable = isNodeModule(filename);
    if (cacheable && nodeModuleCache[filename]) {
        return nodeModuleCache[filename];
    }

    function localRequire(requireLiteral) {
        // TODO remove hard coded "main"
        const depNormId = entryProxy.deps[requireLiteral].main;
        return runEntryInVM(resolver(depNormId), sandbox, resolver);
    }

    const exports = {};
    const module = {exports};

    // the filename is only necessary for uncaught exception reports to point to the right file
    const nodeSource = vm.runInContext(m.wrap(entryProxy.source), sandbox, {filename});
    // function (exports, require, module, __filename, __dirname)
    nodeSource(exports, localRequire, module, filename, path.dirname(filename));

    if (cacheable) {
        nodeModuleCache[filename] = module.exports;
    }

    return module.exports;
}

function evalEntries(entries, mainEntry) {
    const sandbox = {console};
    vm.createContext(sandbox);

    const entryMap = new Map();
    entries.forEach(entry => entryMap.set(entry.normalizedId, entry));

    return runEntryInVM(mainEntry, sandbox, (id) => entryMap.get(id));
}

module.exports = {
    kind: 'gst',
    predicate: function(entry) {
        return !isNodeModule(entry.id) && entry.source.indexOf('getAtomicClasses') >= 0;
    },
    transform: function(context, entries) {
        const main = entries[0];
        const result = evalEntries(entries, main);
        const source = `module.exports=${JSON.stringify({className: result.className, _key: result._key})};`;

        const virtualPath = path.parse(main.id);
        delete virtualPath.base; // node's path honors base when specified even if ext differs
        virtualPath.ext = '.jss';

        context.addVirtualEntry({
            id: path.format(virtualPath),
            source: JSON.stringify(result.csso),
            deps: {},
        });

        return {
            source,
            // After the transform, we
            deps: {},
        };
    },
};
