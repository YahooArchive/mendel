function isRequire (node) {
    var c = node.callee;
    return c
        && node.type === 'CallExpression'
        && c.type === 'Identifier'
        && c.name === 'require'
        && node.arguments[0]
        && node.arguments[0].type === 'Literal';
}
module.exports.isRequire = isRequire;
