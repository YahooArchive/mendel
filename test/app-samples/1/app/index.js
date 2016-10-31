/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

var someMathOperation = require('./math');
var oneNumber = require('./some-number');
var anotherNumber = require('./another-number');
var numberList = require('./number-list');// eslint-disable-line no-unused-vars

var result = someMathOperation(oneNumber(), anotherNumber());
if (module.parent) {
    module.exports = function() { return result; };
} else {
    console.log(result);
}
