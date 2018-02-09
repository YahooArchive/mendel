const babelCore = require('babel-core');
const inliner = require('babel-plugin-transform-inline-environment-variables');

module.exports = function({source, filename, map: inputSourceMap}) {
    if (source.indexOf('process.env') === -1) {
        return {source, map:inputSourceMap};
    }

    const {code, map} = babelCore.transform(source, {
        babelrc: false, // babelrc is ignored and needs to be configured only with the option
        sourceMaps: true, // We don't need inline as we store them separately
        ast: false,
        inputSourceMap, // sourcemap from previous transforms
        filename,
        sourceFileName: filename, // sourcemap contains filename this way
        plugins: [inliner],
    });

    return {source: code, map};
};
