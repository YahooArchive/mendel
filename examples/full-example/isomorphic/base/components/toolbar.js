import React from 'react';
import Button from './button';

let Lazy;

class Toolbar extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            laoded: false
        }
        this.handleClick = this.handleClick.bind(this)
    }

    handleClick() {
        if (!this.state.loaded) {
            Lazy = require('./lazy').default;

            this.setState({
                loaded:true
            });
        }
    }

    render() {
        return (
            <div>
                <nav className="toolbar">
                    <Button onClick={this.handleClick}>Button #1</Button>
                    <Button>Button #2</Button>
                    <Button>Button #3</Button>
                    {Lazy &&
                        <Lazy />
                    }
                </nav>
            </div>
        );
    }
}

export default Toolbar;
