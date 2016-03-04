
var Concentrate = require("concentrate");
var crypto = require("crypto");
var util = require("util");
var URLSafeBase64 = require('urlsafe-base64');

function TreeSerialiser() {
    if (!(this instanceof TreeSerialiser)) { return new TreeSerialiser(); }

    Concentrate.call(this);

    this._result = false;
    this._files = 0;
    this._hash = crypto.createHash('sha1');
    this._metadata();
    return this;
}

util.inherits(TreeSerialiser, Concentrate);

TreeSerialiser.prototype._metadata = function() {
    if (this._meta) throw new Error("Double metadata");

    var name = "mendel";
    var version = 1;
    console.log('version', version);

    this._meta = true;
    return this.string(name).uint8(version);
}

TreeSerialiser.prototype.pushBranch = function(index) {
    if (this._result) throw new Error("Can't pushPath after result");
    return this.uint8(index);
}

TreeSerialiser.prototype.pushFileHash = function(shaHexString) {
    if (this._result) throw new Error("Can't pushFileHash after result");
    this._files++;
    this._hash.update(new Buffer(shaHexString, 'hex'));
    return this;
}

TreeSerialiser.prototype.result = function() {
    if (this._result) return this._result;

    this.uint8(255); // signals end of branches
    this.uint16(this._files);
    this.buffer(this._hash.digest());

    this._result = URLSafeBase64.encode(
        Concentrate.prototype.result.call(this)
    );

    return this._result;
}

module.exports = TreeSerialiser;
