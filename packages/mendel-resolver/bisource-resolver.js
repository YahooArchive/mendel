const VariationalModuleResolver = require('./variational-resolver');

class BiSourceVariationalResolver extends VariationalModuleResolver {
    constructor(options) {
        super(options);

        // Cache has to implement "has" method that returns Boolean when passed
        // a file path
        this.biSourceHas = options.has;
    }

    fileExists(filePath) {
        // If biSourceHas has it, we know for sure it exists.
        // If biSourceHas says no, there is an ambiguity. Check with the FS.
        return Promise.resolve()
        .then(() => this.biSourceHas(filePath))
        .then(result => {
            if (result) return filePath;
            return super.fileExists(filePath);
        });
    }
}

module.exports = BiSourceVariationalResolver;
