import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// --- MetaMask Resilience Guardian ---
/**
 * Professional Promise Interceptor
 * Intercepts unintentional MetaMask connection attempts from background dependencies (e.g., Spline)
 * to ensure a stable, error-free experience without suppressing legitimate application errors.
 */
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || '';
  if (
    reason.includes('MetaMask extension not found') ||
    reason.includes('Failed to connect to MetaMask') ||
    reason.includes('unknown account')
  ) {
    // Gracefully handle background connection attempts
    event.preventDefault();
    console.debug('[Froscel Guardian] Intercepted unintentional wallet connection attempt.');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
