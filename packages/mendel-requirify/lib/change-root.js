var path = require('path');

function changeRoot(file, from, to) {
    var dest = file;
    var fIdx = file.indexOf(from);
    if (fIdx > -1) {
        dest = path.join(to, dest.substring(fIdx + from.length + 1));
    }
    return dest;
}

module.exports = changeRoot;
