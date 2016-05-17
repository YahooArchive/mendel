var t = require('tap');

var MendelServerVariationWalker = require('../lib/tree-variation-walker-server');

t.equals(MendelServerVariationWalker().constructor, MendelServerVariationWalker, 'constructor');

var stub1 = {
    index: 0,
    id: 'first',
    variations: ["a", "b", "special"],
    data: [
        {id:'a', sha:'ba', variation: 'a'},
        {id:'b', variation: 'b'},
        {id:'special', 'variation': 'special'}
    ]
};

var walker = new MendelServerVariationWalker([['a'],['special']], 'special');
walker.find(stub1);
t.same(walker.found(),
    { first: 'a' },
    'variation map');

walker = new MendelServerVariationWalker([['special']], 'special');
walker.find(stub1);

t.same(walker.found(), {
    first: 'special' },
    'variation map');
