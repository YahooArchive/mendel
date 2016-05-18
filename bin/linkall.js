#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var async = require('async');
var exec = require('child_process').exec;

var packagesdir = path.join(__dirname, '../packages');
var examplesdir = path.join(__dirname, '../examples');
var rootdir = path.join(__dirname, '..');
var linkedModules = [];
var linkedDeps = {};

async.reduce([packagesdir, examplesdir], [rootdir], function(packages, dir, doneDir){
    fs.readdir(dir, function eachDir(err, subdirs) {
        subdirs = subdirs.map(function(subdir) {
            return path.join(dir, subdir);
        });
        doneDir(err, packages.concat(subdirs));
    });
}, function linkPackages(err, packages){
    var doAgain = [];

    async.eachSeries(packages, function linkPackage(file, donePackage) {
        var pkgpath = path.join(file, 'package.json');
        if (!fs.existsSync(pkgpath)) {
            return donePackage();
        }

        var pkg = require(pkgpath);
        console.log('linking', pkg.name);

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

        depsToLink && console.log('depsToLink', depsToLink);
        waitFor && console.log('waitFor', waitFor);

        if (waitFor.length) {
            doAgain.push(file);
            return donePackage();
        } else if(depsToLink.length) {
            return async.eachSeries(depsToLink, function(dep, depDone) {
                runLink('npm link ' + dep, file, function() {
                    linkedDeps[file+':'+dep] = true;
                    depDone();
                });
            }, function() {
                doAgain.push(file);
                donePackage();
            });
        }

        runLink('npm link', file, function() {
            linkedModules.push(pkg.name);
            donePackage();
        });
    }, function() {
        if (doAgain.length) {
            linkPackages(null, doAgain);
        }
    });
});

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
