/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms.*/

var path = require('path');

var falafel = require('falafel');
var isRequire = require('../../../lib/falafel-util').isRequire;

function replaceRequiresOnSource (src, wrap) {
    var opts = {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true
    };
    var src = falafel(src, opts, function (node) {
        if (isRequire(node)) {
            var module = node.arguments[0].value;
            node.update("__mendel.require('" + module + "');");
        }
    }).toString();

    if (wrap) {
        src = 'module.exports = function(__mendel, module, exports){\n' +
            src + '\nreturn module.exports;\n};'
    }

    return src;
}

module.exports = replaceRequiresOnSource;
