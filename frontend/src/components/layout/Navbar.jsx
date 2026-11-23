import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function Navbar({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const solid = !transparent || scrolled
  return (
    <nav className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${solid ? 'bg-white shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className={`font-bold text-xl ${solid ? 'text-green-800' : 'text-white'}`}>FarmPilot</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/learn" className={`text-sm font-medium ${solid ? 'text-gray-600' : 'text-white'} hover:text-green-600 transition-colors`}>Learn & Grow</Link>
              <Link to="/projects" className={`text-sm font-medium ${solid ? 'text-gray-600' : 'text-white'} hover:text-green-600 transition-colors`}>My Projects</Link>
              <div className={`text-sm ${solid ? 'text-gray-500' : 'text-green-200'}`}>Hi, {user.name?.split(' ')[0]}</div>
              <button
                onClick={() => { clearAuth(); navigate('/') }}
                className="text-sm px-4 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors"
              >Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/signin" className={`text-sm font-medium ${solid ? 'text-gray-600' : 'text-white'} hover:text-green-600`}>Sign In</Link>
              <Link to="/signup" className="text-sm px-5 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors font-medium">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
