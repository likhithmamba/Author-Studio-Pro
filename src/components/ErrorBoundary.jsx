import { Component } from "react";

export default class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError)
            return (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                    <h2>Something went wrong.</h2>
                    <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
                </div>
            );
        return this.props.children;
    }
}
