var t = require('tap');

var TreeSerialiser = require('../lib/tree-serialiser');

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
"Can't re-init _metadata");

t.throws(
function() {
    sut.pushBranch(1);
},
"Throws if pushBranch after result");

t.throws(
function() {
    sut.pushFileHash(
        new Buffer('f790b83d19df02e79d50eeb84590a32b966f8e13', 'hex'));
},
"Throws if pushFileHash after result");

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

t.equal(sut.result(), bogus.result(), "Don't pushFileHash if it's not a Buffer");




