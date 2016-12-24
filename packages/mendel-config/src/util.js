module.exports = {
    undash: function undashObject(dashedObj) {
        return Object.keys(dashedObj).reduce((undashed, key) => {
            const dashRegexp = /\-([a-z])/i;
            if (dashRegexp.test(key)) {
                const newKey = key.replace(dashRegexp, (dash, letter) => {
                    return letter.toUpperCase();
                });
                undashed[newKey] = dashedObj[key];
            } else {
                undashed[key] = dashedObj[key];
            }
            return undashed;
        }, {});
    },
};
