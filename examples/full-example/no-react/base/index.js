var Constant = require('./constant');
var dep = require('./dep');

module.exports = function() {
    dep.init();
    console.log(Constant.MESSAGE);
};
