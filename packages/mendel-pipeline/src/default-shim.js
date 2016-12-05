module.exports = {
    // Slash at the end of the require literal is important
    // Without slash, require will resolve to node's package.
    // With slash, require will resolve to node_modules'
    assert: require.resolve('assert/'),
    buffer: require.resolve('buffer/'),
    // TODO this needs to be in global scope.
    console: require.resolve('console-browserify/'),
    constants: require.resolve('constants-browserify/'),
    crypto: require.resolve('crypto-browserify/'),
    domain: require.resolve('domain-browser/'),
    events: require.resolve('events/'),
    http: require.resolve('stream-http/'),
    https: require.resolve('https-browserify/'),
    os: require.resolve('os-browserify/'),
    path: require.resolve('path-browserify/'),
    punycode: require.resolve('punycode/'),
    querystring: require.resolve('querystring-es3/'),
    stream: require.resolve('stream-browserify/'),
    string_decoder: require.resolve('string_decoder/'),
    timers: require.resolve('timers-browserify/'),
    tty: require.resolve('tty-browserify/'),
    url: require.resolve('url/'),
    util: require.resolve('util/'),
    vm: require.resolve('vm-browserify/'),
    zlib: require.resolve('browserify-zlib/'),
};
