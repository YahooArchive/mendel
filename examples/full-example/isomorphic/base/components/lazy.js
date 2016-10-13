import React from 'react';
import Button from './button';
import LazyContent from './lazy_content';

class Lazy extends React.Component {
    render() {
        return (
            <p>
                <LazyContent />
                <Button>Lazy Button</Button>
            </p>
        );
    }
}

export default Lazy;
