const test = require('tap').test;
const Resolver = require('../src/resolver');
const VariationalResolver = require('../src/resolver/variational-resolver');
const fs = require('fs');
const path = require('path');
const basePath = path.resolve(__dirname, './fixtures');


['basic', 'package-json'].forEach(dir => {
    const dirPath = path.resolve(basePath, dir);

    test('resolve ' + dir, function(t) {
        const config = {
            extensions: ['.js'],
            envNames: ['main', 'browser'],
            basedir: dirPath,
            cwd: __dirname,
        };

        try {
            Object.assign(config, JSON.parse(fs.readFileSync(path.resolve(dirPath, 'config.json'))));
        } catch (e) {
            // Eslint hates empty block
        }

        return new Resolver(config).resolve('.')
        .then((resolved) => {
            const expected = JSON.parse(fs.readFileSync(path.resolve(dirPath, 'expect.json')));
            t.same(resolved, expected);
            t.end();
        });
    });
});

test('resolve node-modules', function(t) {
    const dir = 'node-modules';
    const dirPath = path.resolve(basePath, dir);
    const config = {
        extensions: ['.js'],
        envNames: ['main', 'browser'],
        basedir: dirPath,
        cwd: __dirname,
    };

    try {
        Object.assign(config, JSON.parse(fs.readFileSync(path.resolve(dirPath, 'config.json'))));
    } catch (e) {
        // Eslint hates empty block
    }

    return new Resolver(config).resolve('mendel-config')
    .then((resolved) => {
        const expected = JSON.parse(fs.readFileSync(path.resolve(dirPath, 'expect.json')));
        t.same(resolved, expected);
        t.end();
    });
});

['easy-variational', 'hard-variational'].forEach(dir => {
    test('variational ' + dir, function(t) {
        const dirPath = path.resolve(basePath, dir);
        const config = {
            extensions: ['.js'],
            envNames: ['main', 'browser'],
            basedir: dirPath,
            cwd: __dirname,
        };
        try {
            Object.assign(config, JSON.parse(fs.readFileSync(path.resolve(dirPath, 'config.json'))));
        } catch (e) {
            // Eslint hates empty block
        }

        return new VariationalResolver(config).resolve('./variations/var1')
        .then((resolved) => {
            const expected = JSON.parse(fs.readFileSync(path.resolve(dirPath, 'expect.json')));
            t.same(resolved, expected);
            t.end();
        });
    });
});
