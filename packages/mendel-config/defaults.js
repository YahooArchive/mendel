module.exports = function() {
    return {
        basedir: process.cwd(),
        outdir: 'mendel-build',
        bundlesoutdir: '',
        serveroutdir: '',
        bundleName: 'bundle',
        manifest: 'bundle.manifest.json',
        base: 'base',
        basetree: 'base',
        variationsdir: '',
        bundles: {},
        variations: {},
        env: {},
        environment: 'development'
    };
};
