
import React from 'react'; // eslint-disable-line no-unused-vars
import { findDOMNode } from 'react-dom'; // eslint-disable-line no-unused-vars
import {
    renderIntoDocument,
    scryRenderedDOMComponentsWithTag
} from 'react-addons-test-utils';
import Toolbar from '../toolbar';

describe("toolbar", function() {
    it("contains a button with correct label", function() {
        const toolbar = renderIntoDocument(<Toolbar />);
        const buttons = scryRenderedDOMComponentsWithTag(toolbar, 'button');

        expect(findDOMNode(buttons[0]).innerText).toBe('Button');
    });
});
