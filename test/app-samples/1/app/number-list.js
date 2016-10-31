/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var oneNumber = require('./some-number');

module.exports = function() {
    var a = [oneNumber()];
    return Array.isArray(a) ? a : [];
};
