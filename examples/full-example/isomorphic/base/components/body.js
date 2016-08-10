import React from 'react';
import Toolbar from './toolbar';
import Board from './message_board';
import Button from './button';

let Lazy;

class Body extends React.Component {
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
        let extras;

        if (this.state.loaded) {
            extras = <Lazy />
        } else {
            extras = <Button onClick={this.handleClick}>Load</Button>
        }

        return (
            <section className="body">
                <Toolbar />
                <Board />
                {extras}
            </section>
        );
    }
}

export default Body;
