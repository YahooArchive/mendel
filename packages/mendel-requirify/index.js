var fs = require('fs-extra');
var through = require('through2');
var mendelRequireTransform = require('./lib/mendel-require-transform');
var changeRoot = require('./lib/change-root');

function isExcluded(file, filters) {
    return filters.some(function (pattern) {
        return pattern.test(file);
    });
}

function asRegExp(pattern) {
    return new RegExp(pattern);
}

function requirify(opts) {
    var written = opts.cache || {};
    var filters = opts.exclude || [];

    filters = filters.map(asRegExp);

    return through.obj(function(row, enc, next) {
        var file = row.file;
        if (file && !written[file]) {
            if (!isExcluded(file, filters)) {
                var dest = changeRoot(file, opts.from, opts.to);
                var out = fs.createOutputStream(dest);
                out.write(mendelRequireTransform(row.source, true));
                out.end();
                written[file] = true;
            }
        }
        next();
    });
}

module.exports = requirify;
