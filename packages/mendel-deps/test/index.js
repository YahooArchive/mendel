const test = require('tap').test;
const deps = require('../');
const {readFileSync} = require('fs');
const glob = require('glob');
const path = require('path');
const Resolver = require('../../mendel-resolver');

glob(__dirname + '/fixtures/**/*.js', null, function(err, files) {
    if (err) throw err;

    const resolver = new Resolver({
        cwd: __dirname + '/fixtures',
        runtimes: ['browser', 'main'],
    });

    files
    .filter(file => file.endsWith('index.js'))
    .forEach(file => {
        const dirname = path.dirname(file);
        resolver.setBaseDir(dirname);

        test(dirname, function(t) {
            return deps({source: readFileSync(file, 'utf8'), resolver})
            .then(deps => {
                // foo, process, and global
                t.equal(Object.keys(deps).length, 3);

                const fooDep = deps['./foo'];
                t.match(fooDep.browser, /foo\/browser.js$/);
                t.match(fooDep.main, /foo\/server.js$/);
            });
        });
    });
});
