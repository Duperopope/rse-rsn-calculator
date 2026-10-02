import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function registerFimoServiceWorker() {
    navigator.serviceWorker.register('/sw.js').catch(function() {
      // L'application reste utilisable en ligne meme si l'enregistrement PWA echoue.
    });
  }, { once: true });
}
