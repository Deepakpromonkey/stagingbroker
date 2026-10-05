import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { purgeLegacyStorageCache } from './lib/memoryCache'

// Entries the localStorage-backed caches left behind (see lib/memoryCache).
purgeLegacyStorageCache()
try {
  ['flash_success_message', 'current_shipment_uuid'].forEach((key) => localStorage.removeItem(key))
} catch {
  /* storage refused */
}

/*
| A tab left open across a deploy still holds the old index, whose page chunks
| are gone from the server once the new build is live. Vite reports that as a
| preload error; reloading once picks up the new build. The flag stops a loop
| if the chunk is missing for some other reason.
*/
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('dt_chunk_reload') === '1') return
    sessionStorage.setItem('dt_chunk_reload', '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

window.addEventListener('load', () => {
  try {
    sessionStorage.removeItem('dt_chunk_reload')
  } catch {
    /* storage refused: nothing to clear */
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

