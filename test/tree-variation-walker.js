var t = require('tap');

var MendelVariationWalker = require('../packages/mendel-core/tree-variation-walker');

t.equals(MendelVariationWalker().constructor, MendelVariationWalker, 'constructor');

var stub1 = {
    index: 0,
    id: 'first',
    variations: ["a", "b", "special"],
    data: [{id:'a', sha:'ba'},{id:'b'},{id:'special'}]
};

var walker = new MendelVariationWalker([['a'],['special']], 'special');
var ret = walker._resolveBranch(stub1);

t.match(ret, {index:0, resolved:{id:'a'}},
    'returns first match');

t.match(walker.conflicts, 0,
    'no conflicts with base');

walker = new MendelVariationWalker([['nope'], ['b'],['special']], 'special');
ret = walker._resolveBranch(stub1);

t.match(ret, {index:1, resolved:{id:'b'}},
    'returns first match');

t.equals(walker.conflicts, 0,
    'no conflicts with base');

walker = new MendelVariationWalker([['a', 'b'],['special']], 'special');
ret = walker._resolveBranch(stub1);

t.equals(walker.conflicts, 0,
    "Two variations on the same level don't conflict");

walker = new MendelVariationWalker([['a'], ['b'],['special']], 'special');
ret = walker.find(stub1);

t.equals(walker.conflicts, 1,
    'detects conflicts');

t.match(walker.conflictList, {'first':true},
    'conflicts map');

t.match(walker.found(), {
  deps: [ { id: 'a', sha: 'ba' } ],
  hash: 'bWVuZGVsAQD_AQAGH7IIQx23k7vTZFt6FgWKHiokEg',
  conflicts: 1,
  conflictList: { first: true } },
'full result inherits from MendelWalker');
