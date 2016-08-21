/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var path = require('path');
var fs = require('fs');
var tmp = require('tmp');

module.exports = validateManifest;

function validateManifest(manifest, originalPath, stepName) {
    var errors = [];

    var requires = /require\(['"](.*?)['"]\)/g;
    var multilineComments = /\/\*(?:\n|.)*\*\//gm;
    var endOfLineComments = /\/\/\*.*/g;

    manifest.bundles.forEach(function(bundle) {
        bundle.data.forEach(function(row) {
            var depNames = Object.keys(row.deps);

            // Find require() on source that don't have a key in deps
            var noCommentsSource = row.source
                                      .replace(multilineComments, '')
                                      .replace(endOfLineComments, '');
            var match;
            while ((match = requires.exec(noCommentsSource)) !== null) {
                if (-1 === depNames.indexOf(match[1])) {
                    errors.push(
                        "can't require '" + match[1] + "' from " + row.id
                    );
                }
            }

            // Find dependencies not included in the manifest
            depNames.forEach(function(key) {
                var externalModule = row.deps[key] === false;
                var existsInManifest = row.deps[key] in manifest.indexes;

                if (!externalModule && !existsInManifest) {
                    errors.push(
                        key + ":" + row.deps[key] +
                                        ' missing from '+ bundle.id);
                }
            });
        });
    });

    if (errors.length) {
        console.log('\n'+stepName+' manifest errors: \n');
        errors.forEach(function(log){
            console.log('  ' + log);
        });

        var tempDir = tmp.dirSync().name;
        var filename = 'debug.' + path.parse(originalPath).base;
        var destination = path.resolve(tempDir, filename);
        fs.writeFileSync(destination, JSON.stringify(manifest, null, 2));

        console.log('\n' + destination + ' written \n');
        process.exit(2);
    }
}
