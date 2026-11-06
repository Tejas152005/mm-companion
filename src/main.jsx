import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from './lib/session'
import App from './App'
import './index.css'
createRoot(document.getElementById('root')).render(<BrowserRouter><SessionProvider><App/></SessionProvider></BrowserRouter>)
