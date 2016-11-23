var Constant = require('./constants/index.js');
var dep = require('./dep.js');

module.exports = function() {
    dep.init();
    console.log(Constant.MESSAGE);
};
