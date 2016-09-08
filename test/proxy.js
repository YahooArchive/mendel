var t = require('tap');
var proxy = require('../packages/mendel-development/proxy');
var onlyPublicMethods = proxy.onlyPublicMethods;

function Iface(name) {
    this.name = name;
}

Iface.prototype = {
    publicMethod: function() {
        return this.name + ' publicMethod';
    },
    _privateMethod: function() {
        return this.name + ' _privateMethod';
    },
    filteredMethod: function() {
        return this.name + ' filteredMethod';
    }
};

function spy(obj, methods) {
    methods.forEach(function(m) {
        var o = obj[m];
        var s = function() {
            var args = Array.prototype.slice.call(arguments);
            var val = o.apply(obj, args);
            this[m].calls.push({
                args: args,
                returns: val
            });
            this[m].callCount++;
            return val;
        };
        s.calls = [];
        s.callCount = 0;
        obj[m] = s;
    });
}

function checkCallCounts(name, obj, methods, counts) {
    methods.forEach(function (m, i) {
        t.equal(obj[m].callCount, counts[i], name + '.' + m + ' calls');
    });
}

var allMethods = ['publicMethod', '_privateMethod', 'filteredMethod'];

var src = new Iface('src');
var dest = new Iface('dest');

proxy(Iface, src, dest, {
    filters: [onlyPublicMethods],
    exclude: ['filteredMethod']
});

spy(src, allMethods);
spy(dest, allMethods);

allMethods.forEach(function (m) {
    src[m].call(src);
});

var methods = Array.prototype.slice.call(allMethods);
checkCallCounts('dest', dest, [methods.shift()], [1]);
checkCallCounts('dest', dest, methods, [0, 0]);

src = new Iface('src');
dest = new Iface('dest');

proxy(Iface, src, dest);

spy(src, allMethods);
spy(dest, allMethods);

allMethods.forEach(function (m) {
    src[m].call(src);
});

checkCallCounts('dest', dest, allMethods, [1, 1, 1]);
