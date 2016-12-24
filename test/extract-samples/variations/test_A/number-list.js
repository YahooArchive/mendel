/* Copyright 2016, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var oneNumber = require('./some-number');
var thirdNumber = require('./third-number');

module.exports = function() {
    var a = [oneNumber(), thirdNumber()];
    return Array.isArray(a) ? a : [];
};
