import React from 'react';
import Button from './button';

class Lazy extends React.Component {
    render() {
        return (
            <p>
                Lazy Content with
                <Button>Lazy Button</Button>
            </p>
        );
    }
}

export default Lazy;
