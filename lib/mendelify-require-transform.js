/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var falafel = require('falafel');
var isRequire = require('./falafel-util').isRequire;
var variationMatches = require('./variation-matches');

function mendelifyRequireTransform(src, variations) {
  var opts = {
      ecmaVersion: 6,
      allowReturnOutsideFunction: true
  };
  return falafel(src, opts, function (node) {
    if (isRequire(node)) {
      var value = node.arguments[0].value;
      var match = variationMatches(variations, value);
      if (match) {
        if(match) node.update('require(\'' + match.file + '\')');
      }
    }
  }).toString();
}

module.exports = mendelifyRequireTransform;
