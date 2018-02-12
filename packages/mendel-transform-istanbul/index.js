const babelCore = require('babel-core');
let istanbul = require('babel-plugin-istanbul');
if (istanbul.default) {
    istanbul = istanbul.default;
}

module.exports = function({source, filename, map: inputSourceMap}) {
    const {code, map} = babelCore.transform(source, {
        babelrc: false, // babelrc is ignored and needs to be configured only with the option
        sourceMaps: true, // We don't need inline as we store them separately
        ast: false,
        inputSourceMap, // sourcemap from previous transforms
        filename,
        sourceFileName: filename, // sourcemap contains filename this way
        plugins: [istanbul],
    });

    return {source: code, map};
};
