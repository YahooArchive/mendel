#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var async = require('async');
var exec = require('child_process').exec;

var packagesdir = path.join(__dirname, '../packages');
var linkedModules = [];
var linkedDeps = {};

fs.readdir(packagesdir, function eachDir(err, packages) {
    var doAgain = [];

    async.eachSeries(packages, function linkPackage(file, donePackage) {
        var pkg = require(path.join(packagesdir, file, 'package.json'));
        var depsToLink = Object.keys(pkg.dependencies||{}).filter(function(dep) {
            if (/^mendel/.test(dep) && !linkedDeps[file+':'+dep]) {
                return true;
            }
            return false;
        });
        var waitFor = depsToLink.filter(function(dep) {
            return -1 == linkedModules.indexOf(dep);
        });

        if (waitFor.length) {
            doAgain.push(file);
            return donePackage();
        } else if(depsToLink.length) {
            return async.eachSeries(depsToLink, function(dep, depDone) {
                runLink(
                    'npm link ' + dep,
                    path.join(packagesdir, file),
                    function() {
                        linkedDeps[file+':'+dep] = true;
                        depDone();
                    }
                );
            }, function() {
                doAgain.push(file);
                donePackage();
            });
        }

        runLink('npm link', path.join(packagesdir, file), function() {
            linkedModules.push(file);
            donePackage();
        });
    }, function() {
        if (doAgain.length) {
            eachDir(null, doAgain);
        }
    });
})

// inspired by enpeem@2.1.0 MIT licensed
function runLink(link, dir, cb) {
    var npm = exec(link, {cwd: dir});
    var stderr$npm = npm.stderr;
    var stdout$npm = npm.stdout;

    stderr$npm.pipe(process.stderr);
    stdout$npm.on('data', function(data) {
        process.stdout.write(data);
    });
    npm.on('exit', cb);
}
