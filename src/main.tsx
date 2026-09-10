import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { AppProviders } from './providers/AppProviders'
import { ThemeProvider } from './context/ThemeContext'
import {
  applyNetworkPreferences,
  registerDigitalHoodServiceWorker,
} from './lib/networkResilience'

import './index.css'

applyNetworkPreferences()
registerDigitalHoodServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AppProviders>
          <App />
          <Toaster position="top-right" />
        </AppProviders>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)

window.addEventListener('load', () => {
  setTimeout(() => {
    const loader = document.getElementById('app-loader')

    if (loader) {
      loader.style.opacity = '0'
      loader.style.transition = 'opacity 0.4s ease'

      setTimeout(() => {
        loader.remove()
      }, 400)
    }
  }, 500)
})
