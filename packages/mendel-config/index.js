var path = require('path');
var configParserLegacy = require('./legacy');
var configParser = require('./src');
var yaml = require('js-yaml');
var fs = require('fs');
var xtend = require('xtend');

function findConfig(where) {
    var parts = where.split(path.sep);

    do {
        var loc = parts.join(path.sep);
        if (!loc) break;

        var config;
        var mendelrc = process.env.MENDELRC || '.mendelrc';
        var rc = path.join(loc, mendelrc);
        if (fs.existsSync(rc)) {
            config = loadFromYaml(rc);
            config.basedir = path.dirname(rc);
            return config;
        }

        var packagejson = path.join(loc, 'package.json');
        if (fs.existsSync(packagejson)) {
            var pkg = require(path.resolve(packagejson));
            if (pkg.mendel) {
                config = pkg.mendel;
                config.basedir = path.dirname(packagejson);
                return config;
            }
        }

        parts.pop();
    } while (parts.length);

    return {
        basedir: where,
        cwd: where,
    };
}

function loadFromYaml(path) {
    return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

module.exports = function(config) {
    if (typeof config === 'string') config = {cwd: config};
    if (typeof config !== 'object') config = {};

    var cwd = config.cwd || config.basedir || process.cwd();
    // support --no-config or {config: false} to skip looking for file configs
    var fileConfig = config.config !== false ? findConfig(cwd) : config;

    config = xtend(fileConfig, config);
    // Why is this required?
    if (fileConfig.cwd) config.cwd = fileConfig.cwd;

    if (config['base-config']) {
        return configParser(config);
    } else {
        return configParserLegacy(config);
    }
};
