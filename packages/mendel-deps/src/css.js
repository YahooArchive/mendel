function walkAst(ast) {
    const imports = [];
    const exports = [];

    if (ast.type !== 'stylesheet') throw TypeError(ast.type);
    ast.stylesheet.rules
    .filter(({type}) => type === 'import')
    .forEach(rule => {
        let normImport = rule.import.trim();
        if (normImport.startsWith('url')) {
            // i.e., url("path") -> path.
            normImport = normImport.match(/url\(["'](\S+)['"]\)$/)[1];
        } else {
            // Strip any quotation marks around path/
            normImport = normImport.match(/^["'](\S+)['"]$/)[1];
        }

        imports.push(normImport);
    });

    return {imports, exports};
}

module.exports = function cssDependency(source) {
    const css = require('css');
    const ast = css.parse(source);
    return walkAst(ast);
};

module.exports.supports = new Set(['.css']);
