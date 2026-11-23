import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import client from '../../api/client'
import useAuthStore from '../../store/authStore'
import ImageWithFallback from '../../components/ui/ImageWithFallback'
import PillSelector from '../../components/forms/PillSelector'
import PageWrapper from '../../components/layout/PageWrapper'

const EXP = [
  { value: 'beginner',     label: '🌱 Beginner' },
  { value: 'intermediate', label: '🌿 Intermediate' },
  { value: 'expert',       label: '🌳 Expert' },
]

export default function SignUp() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    experience_level: 'beginner',
    daily_effort_min: 30,
    power_reliability: 'stable',
  })

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      const { data } = await client.post('/auth/register', form)
      setAuth(data.user, data.access_token)
      toast.success(`Welcome, ${data.user.name}! 🌱`)
      navigate('/onboarding')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageWrapper>
      <div className="min-h-screen flex">
        <div className="hidden lg:block w-1/2 relative">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=900&q=80"
            alt="Hydroponic farm"
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-green-900/50 flex flex-col justify-end p-12">
            <h2 className="text-4xl font-bold text-white mb-3">Start Growing Today</h2>
            <p className="text-green-200 text-lg">Your personalised farm plan in under 5 minutes.</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAF9] overflow-y-auto">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
            <Link to="/" className="text-2xl font-bold text-green-700 mb-8 block">🌿 FarmPilot</Link>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Create Account</h1>
            <p className="text-gray-500 mb-8">Join FarmPilot and plan your first crop.</p>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
              </div>
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
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white pr-12" />
                  <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {show ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Experience Level</label>
                <PillSelector options={EXP} selected={form.experience_level}
                  onToggle={v => setForm({ ...form, experience_level: v })} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60">
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Already have an account?{' '}
              <Link to="/signin" className="text-green-600 font-medium hover:underline">Sign In</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  )
}
