
module.exports = function(easy) {
    var extra = (easy[easy.length-1] === 'l') ? '' : 'l';
    return easy + extra + 'ly';
};
