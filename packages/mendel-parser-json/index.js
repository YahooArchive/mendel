function JSONParser({source} /*, options */) {
    return {
        source: `module.exports = ${source}`,
    };
}

JSONParser.parser = true;
JSONParser.extensions = ['.json'];
JSONParser.compatible = '.js';

module.exports = JSONParser;
