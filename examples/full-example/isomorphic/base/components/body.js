import React from 'react';
import Toolbar from './toolbar';
import Board from './message_board';

class Body extends React.Component {
    render() {
        return (
            <section className="body">
                <Toolbar />
                <Board />
            </section>
        );
    }
}

export default Body;
