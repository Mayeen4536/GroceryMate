import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { HouseholdProvider } from './household/HouseholdProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <HouseholdProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HouseholdProvider>
    </AuthProvider>
  </StrictMode>,
)
