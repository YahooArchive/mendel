const jsdom = require('jsdom').jsdom;
const doc = jsdom('<html><body></body></html>', {});
global.window = doc.defaultView;

// Object.assign replaces console with "window.console"
const browserGlobal = Object.assign({}, global.window);
delete browserGlobal.console;
Object.assign(global, browserGlobal);

(function polyfillAll() {
    function polyfillInnerText() {
        const BLACKLIST_ELEMENT = [
            'OPTION',
            'SCRIPT',
            'NOSCRIPT',
            'STYLE'
        ];
        const INLINE_ELEMENT = [
            'B',
            'BIG',
            'I',
            'SMALL',
            'TT',
            'ABBR',
            'ACRONYM',
            'CITE',
            'CODE',
            'DFN',
            'EM',
            'KBD',
            'STRONG',
            'SAMP',
            'TIME',
            'VAR',
            'A',
            'BDO',
            'BR',
            'IMG',
            'MAP',
            'OBJECT',
            'Q',
            'SCRIPT',
            'SPAN',
            'SUB',
            'SUP',
            'BUTTON',
            'INPUT',
            'LABEL',
            'SELECT',
            'TEXTAREA',
            'LI'
        ];

        function innerText(node) {
            if (!node) return '';
            // Node.TEXT_NODE = 3
            if (node.nodeType === 3) {
                const text = node.nodeValue || '';
                if (text.trim() === '') return '';
                return text;
            }
            let values = Array.from(node.childNodes).filter(node => {
                return BLACKLIST_ELEMENT.indexOf(node.nodeName) < 0;
            }).reduce((reduced, curNode) => {
                return reduced += innerText(curNode);
            }, '').trim();

            if (values[values.length - 1] !== '\n' && INLINE_ELEMENT.indexOf(node.nodeName) < 0) {
                values += '\n';
            }

            return values;
        }

        if (global.window._core.Element.prototype.hasOwnProperty('innerText')) {
            return;
        }

        Object.defineProperty(global.window._core.Element.prototype, 'innerText', {
            get: function() {
                return innerText(this);
            },
            set: function(text) {
                this.innerHTML = text;
            }
        });
    }

    polyfillInnerText();
})();
