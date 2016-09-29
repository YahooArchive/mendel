
import React from 'react'; // eslint-disable-line no-unused-vars
import { findDOMNode } from 'react-dom'; // eslint-disable-line no-unused-vars
import {
    renderIntoDocument
} from 'react-addons-test-utils';
import Button from '../button';

describe("Button", function() {
    it("renders with children", function() {
        const button = renderIntoDocument(<Button>foo</Button>);

        expect(findDOMNode(button).innerText).toBe('foo');
    });
});
