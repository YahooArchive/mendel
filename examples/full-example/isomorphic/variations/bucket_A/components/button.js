import React from 'react';

var count = 0;

class Button extends React.Component {
    render() {
        return <button className="bucket_A">Button A #{++count}</button>;
    }
}

export default Button;
