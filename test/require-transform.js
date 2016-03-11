var t = require('tap');
var requireTransform = require('../lib/require-transform');

var mendelRequireRegexp = /__mendel_require__\(/;
var requireRegexp = /\brequire\(/;

var src = "var foo = require('bar');";

var out = requireTransform(src, false);
t.match(out, mendelRequireRegexp);
t.notMatch(out, requireRegexp);

out = requireTransform(src, true);
t.match(out, mendelRequireRegexp);
t.notMatch(out, requireRegexp);

var wrapper = requireTransform.wrapper;
t.equal(out.indexOf(wrapper[0]), 0, 'wrapper prelude pos');
t.equal(out.indexOf(wrapper[1]), out.length - wrapper[1].length, 'wrapper epilogue pos');
