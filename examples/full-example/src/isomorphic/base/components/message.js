/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */

import React from 'react';

var count = 0;

class Message extends React.Component {
    shouldComponentUpdate() {
        return false;
    }

    render() {
        return <div className="message">Message #{++count}</div>;
    }
}

export default Message;
