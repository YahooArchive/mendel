/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react'; // eslint-disable-line no-unused-vars
import {findDOMNode} from 'react-dom'; // eslint-disable-line no-unused-vars
import {renderIntoDocument} from 'react-addons-test-utils';
import Button from '../button';
import {expect} from 'chai';

describe('Button', function() {
    it('renders with children', function() {
        throw new Error('EXECUTING TEST');
        const button = renderIntoDocument(<Button>meow</Button>);

        expect(findDOMNode(button).innerText).to.equal('meow');
    });
});
