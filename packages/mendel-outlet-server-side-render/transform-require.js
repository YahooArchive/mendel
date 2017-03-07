const path = require('path');
const falafel = require('falafel');
const wrapper = [
    'module.exports = function(__mendel_require__, module, exports) {\n',
    '\n};\nmodule.exports.__mendel_module__ = true;\n',
];

function _wrap(src) {
    return wrapper[0] + src + wrapper[1];
}

function isRequire(node) {
    var c = node.callee;
    return c
        && node.type === 'CallExpression'
        && c.type === 'Identifier'
        && c.name === 'require'
        && node.arguments[0]
        && node.arguments[0].type === 'Literal';
}

// isAbsolutePath copied from browserify MIT licenced source code
function isAbsolutePath(file) {
    var regexp = process.platform === 'win32' ?
        /^\w:/ :
        /^\//;
    return regexp.test(file);
}

function isNonNpmModule(file) {
    return /^\.{1,2}\//.test(file);
}

function replaceRequiresOnSource(destinationPath, entry, getDepPath) {
    const opts = {
        allowReturnOutsideFunction: true,
    };
    const _src = falafel(entry.source, opts, function(node) {
        if (isRequire(node)) {
            var module = node.arguments[0].value;
            if (isAbsolutePath(module)) {
                node.update(
                    "require('" +
                    path.relative(path.dirname(destinationPath), module) +
                    "')"
                );
            } else if (isNonNpmModule(module)) {
                module = getDepPath(entry, module);
                node.update(`__mendel_require__('${module}')`);
            }
        }
    }).toString();

    return _wrap(_src);
}

module.exports = replaceRequiresOnSource;
module.exports.wrapper = wrapper;
module.exports.wrap = _wrap;
