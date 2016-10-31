/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

function getter() {
    return require('./late.js');
}

if (module.parent) {
    module.exports = function(callback) {
        setTimeout(function() {
            callback(getter()());
        }, 10);
    };
} else {
    var ajaxLib = require('prentent-this-is-an-ajax-lib');
    module.exports = function() {
        ajaxLib(getter);
    };
}
