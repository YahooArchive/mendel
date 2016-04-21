import React from 'react';

var count = 0;

class Message extends React.Component {
    render() {
        return <div className="message">Message #{++count}</div>;
    }
}

export default Message;
