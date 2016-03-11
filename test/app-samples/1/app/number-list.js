var isArray = require('isarray');
var oneNumber = require('./some-number')

module.exports = function() {
    var a = [oneNumber()];
    return isArray(a) ? a : [];
};
