const path = require('path');
const test = require('tap').test;
const MendelV2 = require('../packages/mendel-pipeline');
const appPath = path.join(__dirname, '../examples/full-example/');

test('Mendel v2 outlets sanity test', function (t) {
    t.plan(2);

    process.chdir(appPath);
    process.env.MENDELRC = '.mendelrc_v2';

    const mendel = new MendelV2();
    mendel.run(function(error) {
        if (error) {
            console.error(error);
            return t.bailout('should create manifest but failed');
        }

        const manifest = require(path.join(appPath,'build/test.manifest.json'));

        t.matches(manifest, { bundles:[], indexes: {} },
            'manifest has minimal attributes');

        const toolbar = manifest.bundles[
            manifest.indexes['./components/toolbar']
        ];
        const pCVariation = toolbar.data[
            toolbar.variations.indexOf('isomorphic/variations/partner_C')
        ];
        t.matches(pCVariation.deps, {
            react: './node_modules/react/react.js',
            './button': './components/button',
            './dropdown': './components/dropdown',
        }, 'correct variations on conplex scenario');
    });
});
