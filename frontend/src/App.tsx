import { Routes, Route } from 'react-router-dom'
import Nav from './components/Nav'
import Dashboard  from './pages/Dashboard'
import Workflows  from './pages/Workflows'
import Analytics  from './pages/Analytics'
import Anomalies  from './pages/Anomalies'

export default function App() {
  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main className="pt-14 px-6 sm:px-8 lg:px-12 py-8 max-w-7xl mx-auto">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/anomalies" element={<Anomalies />} />
        </Routes>
      </main>

      {/* Footer rule */}
      <footer className="border-t border-border mt-16 px-8 py-4 flex items-center justify-between">
        <span className="label">FlowForge — API Reliability Platform</span>
        <span className="label">v0.1.0</span>
      </footer>
    </div>
  )
}
