var path = require('path');
var glob = require('glob');

module.exports = applyExtraOptions;

function applyExtraOptions(b, options) {

    [].concat(options.ignore).filter(Boolean)
        .forEach(function (i) {
            b._pending ++;
            glob(i, function (err, files) {
                if (err) return b.emit('error', err);
                if (files.length === 0) {
                  b.ignore(i);
                }
                else {
                  files.forEach(function (file) { b.ignore(file) });
                }
                if (--b._pending === 0) b.emit('_ready');
            });
        })
    ;

    [].concat(options.exclude).filter(Boolean)
        .forEach(function (u) {
            b.exclude(u);

            b._pending ++;
            glob(u, function (err, files) {
                if (err) return b.emit('error', err);
                files.forEach(function (file) { b.exclude(file) });
                if (--b._pending === 0) b.emit('_ready');
            });
        })
    ;

    [].concat(options.external).filter(Boolean)
        .forEach(function (x) {
            var xs = splitOnColon(x);
            if (xs.length === 2) {
                add(xs[0], { expose: xs[1] });
            }
            else if (/\*/.test(x)) {
                b.external(x);
                b._pending ++;
                glob(x, function (err, files) {
                    files.forEach(function (file) {
                        add(file, {});
                    });
                    if (--b._pending === 0) b.emit('_ready');
                });
            }
            else add(x, {});

            function add (x, opts) {
                if (/^[\/.]/.test(x)) b.external(path.resolve(x), opts)
                else b.external(x, opts)
            }
        })
    ;

}

function splitOnColon (f) {
    var pos = f.lastIndexOf(':');
    if (pos == -1) {
        return [f]; // No colon
    } else {
        if ((/[a-zA-Z]:[\\/]/.test(f)) && (pos == 1)){
            return [f]; // Windows path and colon is part of drive name
        } else {
            return [f.substr(0, pos), f.substr(pos + 1)];
        }
    }
}
