const test = require('tap').test;
const deps = require('../');
const {readFileSync} = require('fs');
const glob = require('glob');

glob(__dirname + '/fixtures/**/*.js', null, function(err, files) {
    if (err) throw err;

    files
    .filter(file => file.endsWith('index.js'))
    .forEach(file => {
        test(file, function(t) {
            return deps(file, readFileSync(file, 'utf8'))
            .then((deps) => {
                t.equal(deps.length, 1);

                const fooDep = deps[0];

                t.match(fooDep.browser, /foo\/browser.js$/);
                t.match(fooDep.server, /foo\/server.js$/);
            });
        });
    });
});
