import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '../styles/colors.css'
import '../styles/global.css'
import './styles.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
