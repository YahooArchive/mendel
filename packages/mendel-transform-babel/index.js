const babel = require('babel-core');

module.exports = function({source, filename, map: inputSourceMap}, options) {
    // babelrc is ignored and needs to be configured only with the option
    const {code, map} = babel.transform(source,
        Object.assign({
            babelrc: false,
            sourceMaps: 'both',
            inputSourceMap,
            filename,
            sourceFileName: filename,
        }, options));

    return {source: code, map};
};
