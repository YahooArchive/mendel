var subdep = require('./sub-dep');

module.exports = function init() {
    subdep.init();
    console.log('dep initialized');
}
