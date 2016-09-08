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
