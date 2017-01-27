const babel = require('babel-core');
const path = require('path');

function optionDepPath(arr, optionName) {
    return (arr || []).map(el => {
        const name = typeof el === 'string' ? el : el[0];
        const currentCwd = path.join(
            process.cwd(),
            'node_modules',
            `babel-${optionName.toLowerCase()}-${name}`
        );
        const absPath = require.resolve(currentCwd);

        if (typeof el === 'string') return absPath;
        el[0] = absPath;
        return el;
    });
}

module.exports = function({source, filename, map: inputSourceMap}, options) {
    options.presets = optionDepPath(options.presets, 'preset');
    options.plugins = optionDepPath(options.plugins, 'plugin');

    // babelrc is ignored and needs to be configured only with the option
    const {code, map} = babel.transform(source,
        Object.assign({
            babelrc: false,
            sourceMaps: true,
            inputSourceMap,
            filename,
            sourceFileName: filename,
        }, options));

    return {source: code, map};
};
