import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('app-loader');

    if (loader) {
      loader.style.opacity = '0';
      loader.style.transition = 'opacity 0.4s ease';

      setTimeout(() => {
        loader.remove();
      }, 400);
    }
  }, 500);
});