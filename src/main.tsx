import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import App from './App'
import { StartupBoundary, StartupReady } from './components/StartupBoundary'
import { AppProviders } from './providers/AppProviders'
import { ThemeProvider } from './context/ThemeContext'
import {
  applyNetworkPreferences,
  registerDigitalHoodServiceWorker,
} from './lib/networkResilience'

import './index.css'

try { applyNetworkPreferences() } catch (error) { console.warn("Network preferences unavailable", error) }
try { registerDigitalHoodServiceWorker() } catch (error) { console.warn("Offline support unavailable", error) }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StartupBoundary>
      <StartupReady />
    <ThemeProvider>
      <BrowserRouter>
        <AppProviders>
          <App />
          <Toaster position="top-right" />
        </AppProviders>
      </BrowserRouter>
    </ThemeProvider>
    </StartupBoundary>
  </React.StrictMode>
)
