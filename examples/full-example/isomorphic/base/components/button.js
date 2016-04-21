import React from 'react';

var count = 0;

class Button extends React.Component {
    render() {
        return <button>Button #{++count}</button>;
    }
}

export default Button;
