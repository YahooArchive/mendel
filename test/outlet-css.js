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

        t.doesNotHave(css, 'background:red');
        t.include(css, 'html{padding:0}');
        t.include(css, 'body{background:blue}');
        t.same(substringCount(css, 'background:blue'), 1);
    });
});

function substringCount(string, substring) {
    let count = 0, lastIndex = 0;

    while ((lastIndex = string.indexOf(substring)) >= 0) {
        count++;
        string = string.slice(lastIndex + substring.length);
    }

    return count;
}
