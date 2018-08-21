const path = require('path');
const jsDependency = require('./javascript');
const cssDependency = require('./css');

const builtInModules = ['global'].concat(require('repl')._builtinLibs);

function isSupported(extension) {
    return (
        jsDependency.supports.has(extension) ||
        cssDependency.supports.has(extension)
    );
}

function getDependencies(filePath, source) {
    const ext = path.extname(filePath);
    if (jsDependency.supports.has(ext)) {
        return jsDependency(source);
    } else if (cssDependency.supports.has(ext)) {
        return cssDependency(source);
    }
    return {imports: [], exports: []};
}

/**
 * Returns a map of imports in a file.
 * The map is keyed by the literal in the import statement to its resolved path
 * using the resolver that was pased.
 * @example of output
 * {
 *   "./foo": "src/foo/index.ts",
 *   "./bar": "src/bar.js",
 *   "../baz.js": "./baz.js"
 * }
 */
module.exports = function deps({file, resolver, source}) {
    return Promise.resolve()
        .then(() => getDependencies(file, source))
        .then(({imports}) => {
            const promises = imports.map(importLiteral => {
                return resolver.resolve(importLiteral).catch(() => {
                    if (!builtInModules.includes(importLiteral)) {
                        console.warn(
                            `Warning: Can't find ${importLiteral} from ${file}`
                        );
                    }
                    return false;
                });
            });

            return Promise.all(promises).then(resolvedImports => {
                const importMap = {};
                resolvedImports.forEach((resolvedImport, index) => {
                    importMap[imports[index]] = resolvedImport;
                });

                return importMap;
            });
        });
};

module.exports.isSupported = isSupported;
