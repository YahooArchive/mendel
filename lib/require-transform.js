/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms.*/

var falafel = require('falafel');
var isRequire = require('./falafel-util').isRequire;

function replaceRequiresOnSource (src, wrap) {
    var opts = {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true
    };
    src = falafel(src, opts, function (node) {
        if (isRequire(node)) {
            var module = node.arguments[0].value;
            node.update("__mendel.require('" + module + "', parent);");
        }
    }).toString();

    if (wrap) {
        src = 'module.exports = function(__mendel, module, exports, parent){\n' +
            src + '\n};\nmodule.exports.__mendel_module__ = true;\n';
    }

    return src;
}

module.exports = replaceRequiresOnSource;
