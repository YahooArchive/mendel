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
        resolver.setBaseDir(path.dirname(file));

        test(file, function(t) {
            return deps({source: readFileSync(file, 'utf8'), resolver})
            .then(deps => {
                if (file.indexOf('no-global') >= 0) {
                    // foo, Object
                    t.equal(Object.keys(deps).length, 2);
                } else {
                    // foo, console, and process
                    t.equal(Object.keys(deps).length, 3);
                }

                const fooDep = deps['./foo'];
                t.match(fooDep.browser, /foo\/browser.js$/);
                t.match(fooDep.main, /foo\/server.js$/);
            });
        });
    });
});
