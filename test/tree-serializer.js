/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var t = require('tap');

var TreeSerialiser = require('../packages/mendel-core/tree-serialiser');

var sut = TreeSerialiser();

t.equal(sut.constructor, TreeSerialiser, 'correct constructor');

sut = createPredictable();

sut.pushBranch(2);
sut.pushFileHash(new Buffer('f8968ed58fa6f771df78e0be89be5a97c5d3fb59', 'hex'));

var expected = 'bWVuZGVsAQAC_wIACwymnXS-hyyRSwbove5neRfo6fI';

t.equal(sut.result(), expected, 'Hash matches');
t.equal(sut.result(), expected, 'Can call result multiple times');

t.throws(
function() {
    sut._metadata();
},
'Can\'t re-init _metadata');

t.throws(
function() {
    sut.pushBranch(1);
},
'Throws if pushBranch after result');

t.throws(
function() {
    sut.pushFileHash(
        new Buffer('f790b83d19df02e79d50eeb84590a32b966f8e13', 'hex'));
},
'Throws if pushFileHash after result');

function createPredictable() {
    var sut = new TreeSerialiser();
    sut.pushBranch(0);
    sut.pushFileHash(
        new Buffer('6310b41adf425242c338afc1d5f4fbf99cdccf47', 'hex')
    );
    return sut;
}

sut = createPredictable();
var bogus = createPredictable();

bogus.pushFileHash('not a Buffer');

t.equal(sut.result(), bogus.result(), 'Don\'t pushFileHash if it\'s not a Buffer');

var sut1 = createPredictable();
var sut2 = createPredictable();

sut1.pushBranch(1);
sut2.pushBranch(1);
sut1.pushFileHash(new Buffer('f790b83d19df02e79d50eeb84590a32b966f8e13','hex'));
sut2.pushFileHash(new Buffer('f790b83d19df02e79d50eeb84590a32b966f8e13','hex'));

t.equal(sut1.result(), sut2.result(),
    'Consistent result if same files pushed');

sut1 = createPredictable();
sut2 = createPredictable();

sut1.pushBranch(1);
sut2.pushBranch(1);
sut1.pushFileHash(new Buffer('f790b83d19df02e79d50eeb84590a32b966f8e13','hex'));
sut2.pushFileHash(new Buffer('b84590a32b966f8e13f790b83d19df02e79d50ee','hex'));

t.notEqual(sut1.result(), sut2.result(),
    'different result if different hahses pushed');

