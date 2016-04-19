import React from 'react';
import Message from './message';

class Board extends React.Component {
    render() {
        return (
            <div className="board">
                <Message />
                <Message />
                <Message />
            </div>
        );
    }
}

export default Board;
