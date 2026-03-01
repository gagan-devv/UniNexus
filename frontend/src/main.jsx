import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import ErrorBoundary from './components/common/ErrorBoundary'
import * as serviceWorkerRegistration from './serviceWorkerRegistration'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Register service worker for offline caching
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('[App] Service worker registered successfully. Content is cached for offline use.');
  },
  onUpdate: (registration) => {
    console.log('[App] New content is available. Please refresh to update.');
    // Optionally show a notification to the user
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
});