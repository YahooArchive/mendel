const acorn = require('acorn-jsx/inject')(require('acorn'));
const {visit} = require('ast-types');
// `console` is not included as it works flawlessly in Node and browser.
const GLOBAL_WHITELIST = [
    'global',
    'process',
];

// {
//     imports: ['./foo', '../bar', 'baz'],
//     exports: ['helloWorld', 'cruelWorld']
// }
function _depFinder(ast) {
    const imports = {};
    const exports = {};
    const globals = {};

    visit(ast, {
        /************** IMPORT/REQUIRE ***************/
        visitImportDeclaration: function(nodePath) {
            const node = nodePath.value;
            imports[node.source.value] = true;
            return false;
        },
        visitCallExpression: function(nodePath) {
            const node = nodePath.value;

            // cjs require syntax support
            if (
                node.callee.type === 'Identifier' &&
                node.callee.name === 'require' &&
                node.arguments[0].type === 'Literal'
            ) {
                imports[node.arguments[0].value] = true;
            }

            return this.traverse(nodePath);
        },
        visitMemberExpression(nodePath) {
            // console.log(nodePath.parentPath.node)
            const node = nodePath.value;
            if (node.object.type === 'Identifier' &&
                !nodePath.scope.lookup(node.object.name) &&
                GLOBAL_WHITELIST.indexOf(node.object.name) >= 0) {
                globals[node.object.name] = true;
            }

            return this.traverse(nodePath);
        },
        visitExportNamedDeclaration(nodePath) {
            const node = nodePath.value;

            let exportName = '';

            if (!node.declaration && node.specifiers.length) {
                node.specifiers
                .filter(({type}) => type === 'ExportSpecifier')
                .forEach(({exported}) => exports[exported.name] = []);
            } else if (node.declaration) {
                if (node.declaration.type === 'FunctionDeclaration') {
                    exportName = node.declaration.id.name;
                } else if (node.declaration.type === 'VariableDeclaration') {
                    const declarator = node.declaration.declarations
                        .find(({type}) => type === 'VariableDeclarator');
                    exportName = declarator && declarator.id.name;
                }

                if (exportName) {
                    exports[exportName] = [];
                }
            }

            return this.traverse(nodePath);
        },
        visitExportDefaultDeclaration(nodePath) {
            exports.default = [];

            return this.traverse(nodePath);
        },
    });

    Object.keys(globals).forEach(use => {
        imports[use] = true;
    });

    return {
        imports: Object.keys(imports),
        exports: Object.keys(exports),
    };
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
module.exports = function deps({resolver, source}) {
    return Promise.resolve()
    .then(() => {
        const ast = acorn.parse(source, {
            plugins: {jsx: true},
            ecmaVersion: 6,
            sourceType: 'module',
            allowReturnOutsideFunction: true,
            allowHashBang: true,
        });
        // TODO do something useful with the `exports`
        const {imports} = _depFinder(ast);
        const promises = imports.map(importLiteral => {
            return resolver.resolve(importLiteral).catch(() => false);
        });

        return Promise.all(promises)
        .then((resolvedImports) => {
            const importMap = {};
            resolvedImports.forEach((resolvedImport, index) => {
                importMap[imports[index]] = resolvedImport;
            });

            return importMap;
        });
    });
};
