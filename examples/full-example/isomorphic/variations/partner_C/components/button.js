import React from 'react';

var count = 0;

class Button extends React.Component {
    render() {
        return <button className="partner_C">Button C #{++count}</button>;
    }
}

export default Button;
