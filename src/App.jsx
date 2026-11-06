import { Routes, Route, Navigate } from 'react-router-dom'
import './lib/ref'
import './lib/pwa'
import { useSession } from './lib/session'
import Welcome from './pages/Welcome'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Journey from './pages/Journey'
import Progress from './pages/Progress'
import Goal from './pages/Goal'
import Routine from './pages/Routine'
import Refill from './pages/Refill'
import Offers from './pages/Offers'
import Rewards from './pages/Rewards'
import Student from './pages/Student'
import Assistant from './pages/Assistant'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Shell from './components/Shell'
export default function App() {
  const { user, profile, demo, loading } = useSession()
  // Wait for the profile too, so a signed-in person is never sent to the wrong screen while it loads.
  if (loading || (user && !demo && profile === undefined)) return <p className="p-6">Loading…</p>
  const authed = !!(user || demo)
  const needsOnboarding = !!user && !demo && !profile?.onboarded_at
  return (
    <div className="mx-auto max-w-md min-h-screen">
      <Routes>
        <Route path="/" element={!authed ? <Welcome /> : <Navigate to={needsOnboarding ? '/onboarding' : '/home'} />} />
        <Route path="/onboarding" element={!authed ? <Navigate to="/" /> : needsOnboarding ? <Onboarding /> : <Navigate to="/home" />} />
        {/* Consent can't be skipped: a signed-in person who hasn't finished onboarding is always sent back to it. */}
        <Route element={!authed ? <Navigate to="/" /> : needsOnboarding ? <Navigate to="/onboarding" /> : <Shell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/journey" element={<Journey />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/goal" element={<Goal />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/refill" element={<Refill />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/student" element={<Student />} />
          <Route path="/ask" element={<Assistant />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}
