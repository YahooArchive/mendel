const acorn = require('acorn-jsx/inject')(require('acorn'));
const {dirname, join: pathJoin} = require('path');
const {visit} = require('ast-types');
// const browserResolve = require('browser-resolve');
// const serverResolve = require('resolve');
const VariationalResolver = require('./resolver/variational-resolver');

function resolveBoth(basePath, modulePath) {
    return new VariationalResolver({
        basedir: basePath,
        envNames: ['main', 'browser'],
        extensions: ['.js', '.jsx'],
        variationsDir: 'variations',
        baseVariationDir: 'base',
    }).resolve(modulePath);
    // return new Promise(function(resolve, reject) {
    //     serverResolve(modulePath, {basedir: basePath}, function(err, res) {
    //         if (err) reject(err);
    //         // console.log(basePath, modulePath, res);
    //         dependencies.node = res;
    //         if (dependencies.browser && dependencies.node) resolve(dependencies);
    //     });
    //     browserResolve(modulePath, {basedir: basePath}, function(err, res) {
    //         if (err) reject(err);
    //         // console.log(basePath, modulePath, res);
    //         dependencies.browser = res;
    //         if (dependencies.browser && dependencies.node) resolve(dependencies);
    //     });
    // });
}

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

module.exports = function deps(baseDir, fileName, sourceString) {
    try {
        const ast = acorn.parse(sourceString, {
            plugins: {jsx: true},
            ecmaVersion: 6,
            sourceType: 'module',
        });

        const unresolvedModules = _depFinder(ast);
        const fileDirname = pathJoin(baseDir, dirname(fileName));

        return Promise.all(unresolvedModules.map(modulename => resolveBoth(fileDirname, modulename)));
    } catch (error) {
        console.log(fileName);

        return Promise.reject(error);
    }
};
