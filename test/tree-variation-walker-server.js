/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var t = require('tap');

var MendelServerVariationWalker = require('../packages/mendel-core/tree-variation-walker-server');

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

var walker = new MendelServerVariationWalker({
    lookupChains: [['a'],['special']],
    base: 'special'
});
walker.find(stub1);
t.same(walker.found(),
    { first: 'a' },
    'variation map');

walker = new MendelServerVariationWalker({
    lookupChains: [['special']],
    base: 'special'
});
walker.find(stub1);

t.same(walker.found(), {
    first: 'special' },
    'variation map');
