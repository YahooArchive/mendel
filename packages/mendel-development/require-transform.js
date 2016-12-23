/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms.*/

var path = require('path');
var falafel = require('falafel');
var isRequire = require('./falafel-util').isRequire;
var variationMatches = require('./variation-matches');

var wrapper = [
    'module.exports = function(__mendel_require__, module, exports) {\n',
    '\n};\nmodule.exports.__mendel_module__ = true;\n',
];

function _wrap(src) {
    return wrapper[0] + src + wrapper[1];
}

function replaceRequiresOnSource (destinationPath, src, dirs, wrap) {
    var opts = {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true,
    };
    var _src = falafel(src, opts, function (node) {
        if (isRequire(node)) {
            var module = node.arguments[0].value;
            var match = variationMatches([{chain: dirs}], module);

            if (match) {
                node.update("__mendel_require__('" + match.file + "')");
            } else if (isAbsolutePath(module)) {
                node.update(
                    "require('"+
                    path.relative(path.dirname(destinationPath), module)+
                    "')"
                );
            }
        }
    }).toString();

    return wrap ? _wrap(_src) : _src;
}

module.exports = replaceRequiresOnSource;
module.exports.wrapper = wrapper;
module.exports.wrap = _wrap;

// isAbsolutePath copied from browserify MIT licenced source code
function isAbsolutePath (file) {
    var regexp = process.platform === 'win32' ?
        /^\w:/ :
        /^\//;
    return regexp.test(file);
}
