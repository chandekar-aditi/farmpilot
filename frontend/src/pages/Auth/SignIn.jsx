import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import client from '../../api/client'
import useAuthStore from '../../store/authStore'
import ImageWithFallback from '../../components/ui/ImageWithFallback'
import PageWrapper from '../../components/layout/PageWrapper'

export default function SignIn() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [show, setShow] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await client.post('/auth/login', form)
      setAuth(data.user, data.access_token)
      toast.success(`Welcome back, ${data.user.name}! 🌱`)
      navigate('/projects')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="min-h-screen flex">
        {/* Left photo */}
        <div className="hidden lg:block w-1/2 relative">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=900&q=80"
            alt="Hydroponic farm"
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-green-900/50 flex flex-col justify-end p-12">
            <h2 className="text-4xl font-bold text-white mb-3">Welcome Back</h2>
            <p className="text-green-200 text-lg">Your farm is waiting.</p>
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAF9]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Link to="/" className="text-2xl font-bold text-green-700 mb-8 block">🌿 FarmPilot</Link>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Sign In</h1>
            <p className="text-gray-500 mb-8">Access your farm dashboard.</p>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
                <div className="relative">
                  <input type={show ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Your password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white pr-12" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60">
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              New to FarmPilot?{' '}
              <Link to="/signup" className="text-green-600 font-medium hover:underline">Create Account</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  )
}
