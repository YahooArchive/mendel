var oneNumber = require('./some-number');

module.exports = function() {
    var a = [oneNumber()];
    return Array.isArray(a) ? a : [];
};
