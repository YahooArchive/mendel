#!/usr/bin/env node
/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

var packagesdir = path.join(__dirname, '../packages');
var examplesdir = path.join(__dirname, '../examples');
var rootdir = path.join(__dirname, '..');

npm(['install', 'async'], rootdir, function() {
    var async = require('async');
    var linkedModules = [];
    var linkedDeps = {};

    async.reduce([packagesdir, examplesdir], [],
    function(packages, dir, doneDir){
        fs.readdir(dir, function(err, subdirs) {
            subdirs = subdirs.map(function(subdir) {
                return path.join(dir, subdir);
            });
            doneDir(err, packages.concat(subdirs));
        });
    },
    function linkPackages(err, packages){
        var doAgain = [];

        async.eachSeries(packages, function(file, donePackage) {
            var pkgpath = path.join(file, 'package.json');
            if (!fs.existsSync(pkgpath)) {
                return donePackage();
            }

            var pkg = require(pkgpath);

            var deps = Object.keys(pkg.dependencies||{})
                .concat(Object.keys(pkg.devDependencies||{}));

            var depsToLink = deps.filter(function(dep) {
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
                    console.log('local link', dep, 'to', pkg.name, '...');
                    npm(['link', dep], file, function() {
                        linkedDeps[file+':'+dep] = true;
                        depDone();
                    });
                }, function() {
                    doAgain.push(file);
                    donePackage();
                });
            }

            console.log('local install', pkg.name, '...');
            npm('install', file, function() {
                if (/packages/.test(file)) {
                    console.log('local link', pkg.name, '...');
                    npm('link', file, function() {
                        linkedModules.push(pkg.name);
                        donePackage();
                    });
                } else {
                    linkedModules.push(pkg.name);
                    donePackage();
                }
            });
        }, function() {
            if (doAgain.length) {
                linkPackages(null, doAgain);
            }
        });
    });

});

function npm(cmd, dir, cb) {
    if (!Array.isArray(cmd)) cmd = [cmd];
    var npmp = spawn('npm', cmd, {cwd: dir, stdio: 'inherit'});
    npmp.on('exit', cb);
}
