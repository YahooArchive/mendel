/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react'; // eslint-disable-line no-unused-vars
import {findDOMNode} from 'react-dom'; // eslint-disable-line no-unused-vars
import {renderIntoDocument} from 'react-addons-test-utils';
import Button from '../button';
import {expect} from 'chai';

describe('Button [bucket_A]', function() {
    beforeEach(function() {
        // TODO(stephanwlee@gmail.com): JSDOM shim is imperfect that innerText
        // polyfill puts "random" whitespaces. Strip them.
        this.getInnerText = function(node) {
            return findDOMNode(node).innerText.replace(/\s/g, '');
        };
    });
    it('Adds suffix to content', function() {
        const button = renderIntoDocument(<Button />);
        expect(this.getInnerText(button)).to.contain('A#1');
    });
    it('global counter incremented', function() {
        const button = renderIntoDocument(<Button>bar</Button>);
        expect(this.getInnerText(button)).to.contain('A#2');
    });
    it('renders with children', function() {
        const button = renderIntoDocument(<Button>foo</Button>);
        expect(this.getInnerText(button)).to.contain('foo');
    });
});
