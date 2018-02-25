/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   See the accompanying LICENSE file for terms. */
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
        var self = this;
        if (!this.state.loaded) {
            loadAsyncModule(
                function inputRequire() {
                    return require('./lazy');
                },
                function success(module) {
                    Lazy = module.default;
                    self.setState({
                        loaded:true
                    });
                },
                function failure() {
                    alert('Something went wrong');
                }
            );
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

function loadAsyncModule(requireModule, successCallback, failureCallback) {
    try {
        var module = requireModule();
        successCallback(module);
    } catch (error) {
        asyncRequire(requireModule, function(error, payload) {
            if (error) {
                return failureCallback(error);
            }
            successCallback(payload);
        });
    }
}

function asyncRequire(requireModule, callback) {
    var parentRequire = window.require;
    window.require = function(path) {
        var self = this;
        try {
            var payload = parentRequire.apply(
                this, Array.prototype.slice.call(arguments));
            callback(null, payload);
        } catch (error) {
            if (error.code !== 'MODULE_NOT_FOUND') {
                return callback(error);
            }
            loadScript(window._mendelEntryMap[path], function(){
                var payload = parentRequire.call(self, path);
                callback(null, payload);
            });
        }
    }
    requireModule();
    window.require = parentRequire;
}

function loadScript(url, callback) {
    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState){  //IE
        script.onreadystatechange = function(){
            if (script.readyState == "loaded" ||
                    script.readyState == "complete"){
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  //Others
        script.onload = function(){
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

export default Body;
