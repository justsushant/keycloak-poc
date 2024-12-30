import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
      .register('./worker.js')
      .then(() => console.log('Service Worker registered'))
      .catch((error) => console.error('Service Worker registration failed:', error));
} else {
  console.warn('Service workers are not supported in this browser.');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
