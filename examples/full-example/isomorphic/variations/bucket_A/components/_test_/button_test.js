/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react'; // eslint-disable-line no-unused-vars
import { findDOMNode } from 'react-dom'; // eslint-disable-line no-unused-vars
import {
    renderIntoDocument
} from 'react-addons-test-utils';
import Button from '../button';

describe("Button bucket_A", function() {
    it("Adds suffix to content", function() {
        const button = renderIntoDocument(<Button></Button>);

        expect(findDOMNode(button).innerText).toMatch('A#1');
    });
    it("global counter incremented", function() {
        const button = renderIntoDocument(<Button>bar</Button>);

        expect(findDOMNode(button).innerText).toMatch('A#2');
    });
    it("renders with children", function() {
        const button = renderIntoDocument(<Button>foo</Button>);

        expect(findDOMNode(button).innerText).toMatch('foo');
    });
});
