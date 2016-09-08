/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var stream = require("stream");
var StreamCache = require('stream-cache');

module.exports = CachedStreamCollection;

/*
    This class keeps a collection of StreamCache instances.

    A StreamCache will buffer a successful output stream and
    replay to any new pipe. But error handling is prone to memory leaks, since
    we need one error handling for each output stream.

    Instead of piping directly from StreamCache, this class will create pass-
    through streams for each outlet and book-keep an outlet collection per
    stream, and provide helper functions to propagate the error.

    By never exposing the actual StreamCache we prevent consumers from incurring
    memory leak and provide error suggar.
*/

function CachedStreamCollection() {
    this.cache = {};
    return this;
}

var _outlets = '__cached_stream_collection_outlets__';
var methods = CachedStreamCollection.prototype;

methods.createItem = function(id) {
    this.cache[id] = new StreamCache();
    this.cache[id][_outlets] = [];
};

methods.hasItem = function(id) {
    return !!this.cache[id];
};

methods.invalidateItem = function(id) {
    delete this.cache[id];
};

methods.inputPipe = function(id, piper) {
    piper.pipe(this.cache[id]);
};

methods.outputPipe = function(id) {
    var cachedStream = this.cache[id];
    var outlets = cachedStream[_outlets];
    var outStream = new stream.PassThrough();
    outlets.push(outStream);
    outStream.on('end', function() {
        outlets.splice(outlets.indexOf(outStream), 1);
    });
    cachedStream.pipe(outStream);
    return outStream;
};

methods.sendError = function(id, error) {
    this.cache[id][_outlets].forEach(function(stream) {
        stream.emit('error', error);
    });
    this.invalidateItem(id);
};
