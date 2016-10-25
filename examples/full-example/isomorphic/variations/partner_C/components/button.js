/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';

var count = 0;

class Button extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            count: ++count
        }
    }
    render() {
        return (
            <button className="partner_C" {...this.props}>
                {this.props.children}
                C#{this.state.count}
            </button>
        );
    }
}

export default Button;
