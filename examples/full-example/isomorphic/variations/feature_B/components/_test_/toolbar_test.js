/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react'; // eslint-disable-line no-unused-vars
import { findDOMNode } from 'react-dom'; // eslint-disable-line no-unused-vars
import {
    renderIntoDocument,
    scryRenderedDOMComponentsWithTag
} from 'react-addons-test-utils';
import Toolbar from '../toolbar';
import {expect} from 'chai';

describe("toolbar feature_B", function() {
    it("contains 3 buttons", function() {
        const toolbar = renderIntoDocument(<Toolbar />);
        const buttons = scryRenderedDOMComponentsWithTag(toolbar, 'button');

        expect(buttons.length).to.equal(3);
        expect(findDOMNode(buttons[0]).innerText).to.equal('B');
        expect(findDOMNode(buttons[1]).innerText).to.equal('B');
        expect(findDOMNode(buttons[2]).innerText).to.equal('B');
    });
});
