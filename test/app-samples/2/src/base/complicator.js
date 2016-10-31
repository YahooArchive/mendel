/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

module.exports = function(easy) {
    var extra = (easy[easy.length-1] === 'l') ? '' : 'l';
    return easy + extra + 'ly';
};
