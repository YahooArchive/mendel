
var easyWord = require('./easy');
var complexWord = require('./complex');
var lateWord = require('./get_late');

function printWith(printFunction) {
    lateWord(function(resolvedWord) {
        var string = [
            easyWord(),
            complexWord(),
            'or',
            resolvedWord,
        ].join(' ');
        printFunction(string);
    });
}

if (module.parent) {
    module.exports = printWith;
} else {
    printWith(writeToDOM);
}

function writeToDOM(string) {
    /* global document */
    document.querySelector('body').innerText = string;
}
