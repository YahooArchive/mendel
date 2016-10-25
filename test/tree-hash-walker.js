/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var t = require('tap');

var MendelHashWalker = require('../packages/mendel-core/tree-hash-walker');
t.equal(MendelHashWalker().constructor, MendelHashWalker, 'constructor');

var validHash = 'bWVuZGVsAQD_AQAGH7IIQx23k7vTZFt6FgWKHiokEg';
var walker = new MendelHashWalker(validHash);
t.equal(walker.error, null, 'Initialized without errors');

walker.decoded.branches = [3];
var module = {data:[null, null, null, {id:'3'}]};

t.match(walker._resolveBranch(module), {
    index: 3,
    resolved: module.data[3]
}, 'pulls module based on decoded branches');

module = {data:[{id:'foo'}, {id:'bar'}]};

t.match(walker._resolveBranch(module), {
    index: undefined,
    resolved: {}
}, "won't throw with wrong data");

t.match(walker.error, new Error());
t.equal(walker.error.message, 'Tree has more paths than hash',
    'error message');
t.equal(walker.error.code, 'TRVRSL',
    'error code');

walker.decoded.branches = [0,1,2,3,4];
walker._resolveBranch(module);
t.equal(walker.error.message, 'Tree has more paths than hash',
    'keep the first error');

walker = new MendelHashWalker(validHash);
walker.decoded.branches = [4];
walker._resolveBranch(module);
t.equal(walker.error.message, 'Hash branch not found in tree',
    'different error message when different error');

var f = walker.found();
t.match(f, {
    error: new Error()
}, 'proper output whith error');
t.notEqual(f.hash, validHash, 'different hash when error present');
t.equal(f.error.code, 'TRVRSL',  'but same error code');

walker = new MendelHashWalker(validHash);
module = {data:[null, null, null, {id:'3', index:3, sha:'99'}]};
walker.decoded.branches = [3];
walker.find(module);

t.match(walker.found(), {
    error: new Error(),
}, 'Parsed ok, but hash mismatch');
t.notEqual(f.error.code, 'HASHMISS',  'but same error code');


var stub1 = {
    index: 0,
    id: 'first',
    variations: ["a", "b", "special"],
    data: [{id:'a', variation:'a', sha:'ba'},{id:'b'},{id:'special'}]
};
validHash = 'bWVuZGVsAQD_AQAGH7IIQx23k7vTZFt6FgWKHiokEg';
walker = new MendelHashWalker(validHash);
module = {data:[null, null, null, {id:'3', index:3, sha:'99'}]};
walker.decoded.branches = [0];
walker.find(stub1);

var expected = {
    deps: [{
        id: 'a',
        variation: 'a',
        sha: 'ba'
    }],
    hash: 'bWVuZGVsAQD_AQAGH7IIQx23k7vTZFt6FgWKHiokEg',
    error: null
};

t.match(walker.found(), expected, 'full result matching hash');
