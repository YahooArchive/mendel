const path = require('path');
const test = require('tap').test;
const rimraf = require('rimraf');
const fs = require('fs');
const MendelV2 = require('../packages/mendel-pipeline');
const appPath = path.join(__dirname, './css-samples');
const buildPath = path.join(appPath, 'build');

rimraf.sync(buildPath);

test('mendel-outlet-css sanity test', function (t) {
    t.plan(4);

    process.chdir(appPath);
    process.env.MENDELRC = '.mendelrc';

    const mendel = new MendelV2();
    mendel.run(function(error) {
        if (error) {
            console.error(error);
            return t.bailout('should create manifest but failed');
        }

        const css = fs.readFileSync(path.join(buildPath, 'main.css'), 'utf8');

        t.doesNotHave(css, 'background: red');
        t.include(css, 'padding: 0');
        t.include(css, 'background: blue');
        // From LESS
        t.include(css, 'background: #1111ff');
    });
});
