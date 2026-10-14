import React from 'react';
import ReactDOM from 'react-dom/client';
import { PopupApp } from './PopupApp';
import { ThemeProvider } from '../components/Layout/ThemeProvider';
import './popup.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <PopupApp />
    </ThemeProvider>
  </React.StrictMode>
);
