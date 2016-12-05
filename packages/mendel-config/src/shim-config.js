function ShimConfig({shim, defaultShim}) {
    return Object.assign({}, defaultShim, shim);
}

module.exports = ShimConfig;
