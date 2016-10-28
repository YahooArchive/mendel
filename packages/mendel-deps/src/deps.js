const acorn = require('acorn-jsx/inject')(require('acorn'));
const {visit} = require('ast-types');
const Resolver = require('./resolver');

function _depFinder(ast) {
    const unresolved = {};

    visit(ast, {
        /************** IMPORT/REQUIRE ***************/
        visitImportDeclaration: function(nodePath) {
            const node = nodePath.value;
            unresolved[node.source.value] = true;
            return false;
        },
        visitExportNamedDeclaration: function(nodePath) {
            const node = nodePath.value;

            if (node.declaration || !node.source) return this.traverse(nodePath);

            unresolved[node.source.value] = true;
            return false;
        },
        visitCallExpression: function(nodePath) {
            const node = nodePath.value;

            // cjs require syntax support
            if (node.callee.type === 'Identifier' && node.callee.name === 'require' && node.arguments[0].type === 'Literal') {
                unresolved[node.arguments[0].value] = true;
            }

            return false;
        },
    });

    return Object.keys(unresolved);
}

module.exports = function deps({resolver, source}) {
    try {
        const ast = acorn.parse(source, {
            plugins: {jsx: true},
            ecmaVersion: 6,
            sourceType: 'module',
        });
        const unresolvedModules = _depFinder(ast);

        if (!(resolver instanceof Resolver)) return Promise.reject('Resolver must be an instance of mendel-resolver.');
        return Promise.all(unresolvedModules.map(modulename => resolver.resolve(modulename)));
    } catch (error) {
        return Promise.reject(error);
    }
};
