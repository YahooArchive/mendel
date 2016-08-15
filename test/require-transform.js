var t = require('tap');
var requireTransform = require('../packages/mendel-development/require-transform');
var wrapper = requireTransform.wrapper;

var variationDirs = ['variation1', 'variation2', 'base'];
var src = [
    "var foo = require('foo');",
    "var bar = require('some/dir/variation1/bar');",
    "var baz = require('some/dir/variation2/baz');",
    "var qux = require('some/dir/base/qux');"
].join('\n');

var mendelifiedModules = ['bar', 'baz', 'qux'];
var out = requireTransform('./', src, variationDirs, false);

mendelifiedModules.forEach(function(mod) {
    t.match(out, "__mendel_require__('" + mod + "')", 'mendelified require');
    t.notMatch(out, "require('" + mod + "')", 'node require');
});

t.match(out, "require('foo')", 'node require');
t.notMatch(out, "__mendel_require__('foo')", 'mendelified require');

t.equal(out.indexOf(wrapper[0]), -1, 'wrapper prelude not present');
t.equal(out.indexOf(wrapper[1]), -1, 'wrapper epilogue not present');

out = requireTransform('./', src, variationDirs, true);
t.equal(out.indexOf(wrapper[0]), 0, 'wrapper prelude pos');
t.equal(out.indexOf(wrapper[1]), out.length - wrapper[1].length, 'wrapper epilogue pos');
