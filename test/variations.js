var t = require('tap');
var path = require('path');

var parseVariations = require('../packages/mendel-config/variations');

var rootDir = path.resolve(__dirname, './variation-samples/1/variations');

process.chdir(rootDir);


t.match(parseVariations({}), [],
    "fails gracefully without variations");


var config = {
    base: "test_base",
    variations: {
        folder_A: null,
        doNotExist: null
    }
};
var expected = [{
    id: 'folder_A',
    chain: ['folder_A', "test_base"]
}];
t.match(parseVariations(config), expected,
    "makes sure folders exists, honors config.base");

config.basetree = "tree1";
expected[0].chain[1] = "tree1";

t.match(parseVariations(config), expected,
    "config.basetree preceedes config.base");

delete config.basetree;
delete config.base;
expected[0].chain[1] = rootDir;

t.match(parseVariations(config), expected,
    "fallback to basedir to current dir");

rootDir = path.resolve(__dirname, './variation-samples/1/');
process.chdir(rootDir);

config =  {
    basetree: 'base',
    variationsdir: 'variations',
    variations: {
        _: [], // commandline compatibility
        experiment_A: {
            _: ['folder_A'] // commandline compatibility
        },
        experiment_B: ['folder_B'],
        experiment_C: ['folder_C'],
        experiment_D: ['folder_C', 'folder_A']
    }
};
expected = [{
    id: 'experiment_A',
    chain: ['folder_A', "base"]
}, {
    id: 'experiment_C',
    chain: ['folder_C', "base"]
}, {
    id: 'experiment_D',
    chain: ['experiment_D', 'folder_C', 'folder_A', "base"]
}];

t.match(parseVariations(config), expected,
    "grouped variation dirs complex example");

rootDir = path.resolve(__dirname, './variation-samples/2/');
process.chdir(rootDir);

config =  {
    base: 'default',
    basedir: 'src',
    basetree: '_default',
    variations: {
        experiment_A: null,
        experiment_B: null,
        experiment_C: ['experiment_A']
    }
};
expected = [{
    id: 'experiment_A',
    chain: ['experiment_A', "_default"]
}, {
    id: 'experiment_B',
    chain: ['experiment_B', "_default"]
}, {
    id: 'experiment_C',
    chain: ['experiment_C', 'experiment_A', "_default"]
}];

t.match(parseVariations(config), expected,
    "flat directory structure example");

