import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] CRASH:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'var(--danger, #EF4444)', padding: '20px', fontSize: '14px', background: 'var(--bg-input, #1A1F2B)', borderRadius: '12px', margin: '8px' }}>
          <h3 style={{ margin: '0 0 8px 0' }}>Erreur dans ce composant</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: 'var(--warning, #F59E0B)', background: 'var(--bg, #0B0D10)', padding: '8px', borderRadius: '8px' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: '10px', padding: '8px 16px', background: '#60a5fa', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Reessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
