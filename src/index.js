import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Assuming you have a basic index.css for styling setup

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* The App component contains all the menu logic and UI */}
    <App />
  </React.StrictMode>,
);
