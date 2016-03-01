
function proxyMethod(method, source, destination) {
    var oldMethod = source[method];
    source[method] = function() {
        var args = Array.prototype.slice.call(arguments);
        destination[method].apply(destination, args);
        return oldMethod.apply(source, args);
    }
}

function onlyPublicMethods(method) {
    return method.indexOf('_') !== 0;
}

function notIn(methods) {
    return function(method) {
        return methods.indexOf(method) === -1;
    };
}

function proxy(iface, src, dest, opts) {
    var filters = opts.filters || [];
    var exclude = opts.exclude || [];

    if (exclude.length) {
        filters.push(notIn(filters));
    }

    filters.reduce(function (methods, fn) {
        return methods.filter(fn);
    }, Object.keys(iface.prototype))
    .forEach(function(method) {
        proxyMethod(method, src, dest);
    });
}

module.exports = proxy;
module.exports.onlyPublicMethods = onlyPublicMethods;
