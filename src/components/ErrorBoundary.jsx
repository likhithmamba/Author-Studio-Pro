import { Component } from "react";

export default class ErrorBoundary extends Component {
    state = { hasError: false, error: null, retryKey: 0 };

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("[ErrorBoundary] Caught render error:", error, info?.componentStack);
    }

    handleRetry = () => {
        // Clear any stale auth token that may be causing the crash
        try { localStorage.removeItem('inkforge_token') } catch {}
        this.setState(s => ({ hasError: false, error: null, retryKey: s.retryKey + 1 }));
    };

    render() {
        if (this.state.hasError) {
            const msg = this.state.error?.message || 'An unexpected error occurred.';
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '100vh',
                    background: '#050810', color: '#e2e8f0', textAlign: 'center',
                    padding: '2rem', gap: '1rem', fontFamily: 'Inter, sans-serif'
                }}>
                    <div style={{ fontSize: '3rem' }}>!</div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>Something went wrong</h2>
                    <p style={{ margin: 0, opacity: 0.6, maxWidth: 400, fontSize: '0.9rem' }}>
                        {msg.includes('fetch') || msg.includes('Network')
                            ? 'Could not connect to the backend. Make sure the server is running, then try again.'
                            : msg}
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button
                            onClick={this.handleRetry}
                            style={{
                                padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600
                            }}
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '0.6rem 1.5rem', borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.15)',
                                background: 'transparent', color: '#e2e8f0',
                                cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }
        return <div key={this.state.retryKey}>{this.props.children}</div>;
    }
}
