const babel = require('babel-core');

module.exports = function({source, filename}, options) {
    // babelrc is ignored and needs to be configured only with the option
    const {code, map} = babel.transform(source, Object.assign({babelrc: false}, options));

    return {source: code, map};
};
