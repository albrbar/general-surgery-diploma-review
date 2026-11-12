import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

const baseUrl = window.location.pathname.startsWith('/general-surgery-diploma-review')
  ? '/general-surgery-diploma-review/'
  : '/'
const manifestLink = document.createElement('link')
manifestLink.rel = 'manifest'
manifestLink.href = `${baseUrl}manifest.webmanifest`
document.head.appendChild(manifestLink)

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${baseUrl}sw.js`, { scope: baseUrl })
      .catch((error) => console.warn('Offline mode could not be enabled:', error))
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
