/* Copyright 2015, Yahoo Inc.
   Designed by Irae Carvalho
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var Dissolve = require("dissolve");
var URLSafeBase64 = require('urlsafe-base64');

function deserialize(treeHash, callback) {
    if (!callback) return;

    var branches = [];
    var parser = new Dissolve()
        .string('name', 6)
        .uint8('version')
        .loop('branches', function(end) {
            this.uint8('data').tap(function() {
                if (this.vars.data === 255) {
                    return end();
                }
                branches.push(this.vars.data);
            })
        })
        .tap(function() {
            this.vars.branches = branches;
        })
        .uint16('files')
        .buffer('hash', 20)
        .tap(function() {
            this.vars.hash = this.vars.hash.toString('hex');
        })
        .tap(function() {
            this.push(this.vars);
        })

    parser.on("readable", function() {
        var value = parser.read();
        value && callback(value);
    });


    var binary = new Buffer(URLSafeBase64.decode(treeHash));

    parser.write(binary);

}

module.exports = deserialize;
