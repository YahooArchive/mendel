
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
