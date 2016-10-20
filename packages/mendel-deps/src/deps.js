const acorn = require('acorn-jsx/inject')(require('acorn'));
const {dirname} = require('path');
const {visit} = require('ast-types');
const browserResolve = require('browser-resolve');
const serverResolve = require('resolve');

function deps(fileName, sourceString) {
    const ast = acorn.parse(sourceString, {
        plugins: {jsx: true},
        ecmaVersion: 6,
        sourceType: 'module',
    });
    const unresolvedModules = depFinder(ast);
    const fileDirname = dirname(fileName);

    return Promise.all(unresolvedModules.map(modulename => resolveBoth(fileDirname, modulename)));
}

function resolveBoth(basePath, modulePath) {
    const dependencies = {};

    return new Promise(function(resolve, reject) {
        serverResolve(modulePath, {basedir: basePath}, function(err, res) {
            if (err) reject(err);
            // console.log(basePath, modulePath, res);
            dependencies.server = res;
            if (dependencies.browser && dependencies.server) resolve(dependencies);
        });
        browserResolve(modulePath, {basedir: basePath}, function(err, res) {
            if (err) reject(err);
            // console.log(basePath, modulePath, res);
            dependencies.browser = res;
            if (dependencies.browser && dependencies.server) resolve(dependencies);
        });
    });
}

function depFinder(ast) {
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

module.exports = deps;
