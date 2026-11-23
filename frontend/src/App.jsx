import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import useAuthStore from './store/authStore'

import Landing        from './pages/Landing'
import SignIn         from './pages/Auth/SignIn'
import SignUp         from './pages/Auth/SignUp'
import InputWizard    from './pages/Onboarding/InputWizard'
import CropCards      from './pages/Recommendation/CropCards'
import ProjectList    from './pages/Project/ProjectList'
import ProjectLayout  from './pages/Project/ProjectLayout'
import LearnPage      from './pages/Learn/LearnPage'
import CropDetail     from './pages/Learn/CropDetail'

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/signin" replace />
  return children
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"               element={<Landing />} />
        <Route path="/signin"         element={<SignIn />} />
        <Route path="/signup"         element={<SignUp />} />
        <Route path="/onboarding"     element={<ProtectedRoute><InputWizard /></ProtectedRoute>} />
        <Route path="/recommendations"element={<ProtectedRoute><CropCards /></ProtectedRoute>} />
        <Route path="/projects"       element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
        <Route path="/projects/:id/*" element={<ProtectedRoute><ProjectLayout /></ProtectedRoute>} />
        <Route path="/learn"          element={<ProtectedRoute><LearnPage /></ProtectedRoute>} />
        <Route path="/learn/:cropId"  element={<ProtectedRoute><CropDetail /></ProtectedRoute>} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
