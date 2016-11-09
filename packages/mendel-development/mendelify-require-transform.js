/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var falafel = require('falafel');
var isRequire = require('./falafel-util').isRequire;

var regexExt = /(\.js|\.coffee|\.coffee.md|\.litcoffee|\.jsx|\.es|\.es6)$/;

function mendelifyRequireTransform(filename, src, transformerFn) {
    var opts = {
        ecmaVersion: 6,
        allowReturnOutsideFunction: true
    };
    if (!regexExt.test(filename)) {
        return src;
    }
    return falafel(src, opts, function(node) {
        if (isRequire(node)) {
            var value = node.arguments[0].value;
            var newValue = transformerFn(value);
            if (newValue !== value) {
                node.update('require(\'' + newValue + '\')');
            }
        }
    }).toString();
}

module.exports = mendelifyRequireTransform;
