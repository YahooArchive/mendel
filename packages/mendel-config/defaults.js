module.exports = function() {
    return {
        basedir: process.cwd(),
        outdir: 'mendel-build',
        bundlesoutdir: '',
        serveroutdir: '',
        bundleName: 'bundle',
        base: 'base',
        basetree: 'base',
        variationsdir: '',
        bundles: {},
        variations: {},
        env: {},
        environment: 'development'
    };
};
