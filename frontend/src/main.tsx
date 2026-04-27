import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './contexts/AuthContext'
import './styles/globals.css'

// En mode dev, simule l'injection WordPress si absent
// Changer roles pour tester un autre rôle :
//   ['locagest_resp_location'] | ['locagest_tresorier']
if (import.meta.env.DEV && !window.locagestConfig) {
  window.locagestConfig = {
    apiBase: '/wp-json/locagest/v1',
    token:   'mock-jwt-locagest_gardien',
    roles:   ['locagest_gardien'],
    userEmail: 'gardien@test.fr',
    username:  'gardien',
  }
}

async function enableMocking() {
  if (!import.meta.env.DEV) return
  if (import.meta.env.VITE_USE_MOCK === 'false') return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </React.StrictMode>,
  )
})
