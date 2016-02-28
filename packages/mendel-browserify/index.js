var variations = require('./lib/variations');

module.exports = mendelBrowserify;

function mendelBrowserify(b, opts) {
  logObj(variations(opts));
}

function logObj(obj) {
  console.log(require('util').inspect(obj,false,null,true));
  return obj;
}
