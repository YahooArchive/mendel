const path = require('path');

function ShimConfig({projectRoot, shim, defaultShim}) {
    const ret = Object.assign({}, defaultShim, shim);
    Object.keys(ret).forEach(moduleName => {
        if (!ret[moduleName]) return;
        ret[moduleName] = path.relative(projectRoot, ret[moduleName]);
    });
    return ret;
}

module.exports = ShimConfig;
