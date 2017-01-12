const tap = require('tap');
const path = require('path');
const appPath = path.resolve(__dirname, './extract-samples');
const appBuildPath = path.join(appPath, 'build');

const MendelV2 = require('../packages/mendel-pipeline');
const rimraf = require('rimraf');

process.env.MENDELRC = '.extract.mendelrc';

tap.test('Build the extraction app', function(t) {
    t.plan(2);
    rimraf.sync(appBuildPath);
    rimraf.sync(path.join(appPath, '**/*/.mendelipc'));
    process.chdir(appPath);

    const mendel = new MendelV2();

    mendel.run((error) => {
        if (error) return t.bailout('should create manifest but failed', error);

        const main = require(path.join(appBuildPath, 'main.manifest.json'));
        const lazy = require(path.join(appBuildPath, 'lazy.manifest.json'));

        t.matches(main.indexes, {
            './': /\d/,
            './math': /\d/,
            './some-number': /\d/,
        }, 'indices have all normalizedId expected in main');
        t.matches(lazy.indexes, {
            './another-number': /\d/,
            './number-list': /\d/,
            './util': /\d/,
            './third-number': /\d/,
        }, 'indices have all normalizedId expected in lazy');
    });
});
