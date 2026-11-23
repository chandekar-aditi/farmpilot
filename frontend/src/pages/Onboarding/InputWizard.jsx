import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import client from '../../api/client'
import useRecommendStore from '../../store/recommendStore'
import useAuthStore from '../../store/authStore'
import ProgressDots from '../../components/ui/ProgressDots'
import PillSelector from '../../components/forms/PillSelector'
import PageWrapper from '../../components/layout/PageWrapper'

const GOALS = [
  { value: 'home_kitchen',    label: 'Home Kitchen', icon: '🥗' },
  { value: 'commercial_sale', label: 'Commercial Sale', icon: '💰' },
  { value: 'fast_harvest',    label: 'Fast Harvest', icon: '⚡' },
  { value: 'low_effort',      label: 'Low Effort', icon: '🌿' },
  { value: 'high_yield',      label: 'High Yield', icon: '📦' },
  { value: 'learn_hydroponics',label: 'Learn Hydroponics', icon: '🌱' },
]
const POWER = [
  { value: 'stable',     label: 'Stable 24/7' },
  { value: 'occasional', label: 'Occasional Cuts' },
  { value: 'frequent',   label: 'Frequent Cuts' },
]
const ENV = [
  { value: 'indoor',  label: '🏠 Indoor' },
  { value: 'outdoor', label: '☀️ Outdoor' },
  { value: 'both',    label: '🌍 Both' },
]
const EXP = [
  { value: 'beginner',     label: '🌱 Beginner' },
  { value: 'intermediate', label: '🌿 Intermediate' },
  { value: 'expert',       label: '🌳 Expert' },
]

const TOTAL = 8

export default function InputWizard() {
  const navigate = useNavigate()
  const { setWizardAnswers, setRecommendations } = useRecommendStore()
  const user = useAuthStore((s) => s.user)
  const [step, setStep]       = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    space_sqft:        '',
    height_ft:         '',
    environment:       'indoor',
    max_budget_inr:    20000,
    primary_goals:     [],
    power_reliability: 'stable',
    daily_effort_min:  30,
    experience:        user?.experience_level || 'beginner',
    temperature_c:     28,
    humidity_pct:      60,
  })

  const next = () => setStep(s => Math.min(s + 1, TOTAL - 1))
  const back = () => setStep(s => Math.max(s - 1, 0))

  const finish = async () => {
    if (form.primary_goals.length < 2) { toast.error('Please select at least 2 goals'); return }
    if (!form.space_sqft || !form.height_ft) { toast.error('Please fill in space and height'); return }
    setLoading(true)
    try {
      setWizardAnswers(form)
      const { data } = await client.post('/recommend', {
        ...form,
        space_sqft: parseFloat(form.space_sqft),
        height_ft:  parseFloat(form.height_ft),
      })
      setRecommendations(data)
      navigate('/recommendations')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not get recommendations. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const slide = {
    enter: { x: 50, opacity: 0 },
    center:{ x: 0,  opacity: 1 },
    exit:  { x: -50,opacity: 0 },
  }

  const steps = [
    // 0 — Space
    <div key="0" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Your Growing Space</h2>
      <p className="text-gray-500 text-sm">Measure the floor area and ceiling height where you plan to grow.</p>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Floor Space (sq. ft.)</label>
        <input type="number" min="1" value={form.space_sqft}
          onChange={e => setForm({ ...form, space_sqft: e.target.value })}
          placeholder="e.g. 50"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-lg" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Ceiling Height (ft.)</label>
        <input type="number" min="1" step="0.5" value={form.height_ft}
          onChange={e => setForm({ ...form, height_ft: e.target.value })}
          placeholder="e.g. 7"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-lg" />
      </div>
    </div>,

    // 1 — Environment
    <div key="1" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Environment</h2>
      <p className="text-gray-500 text-sm">Where will your farm be located?</p>
      <PillSelector options={ENV} selected={form.environment} onToggle={v => setForm({ ...form, environment: v })} />
      {(form.environment === 'outdoor' || form.environment === 'both') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ Outdoor setups have higher water evaporation. We'll account for this in top-up protocols.
        </div>
      )}
    </div>,

    // 2 — Budget
    <div key="2" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Maximum Budget</h2>
      <p className="text-gray-500 text-sm">Covers hardware setup + first cycle nutrients and seeds.</p>
      <div className="text-center py-2">
        <div className="text-5xl font-extrabold text-green-700 mb-5">
          ₹{form.max_budget_inr.toLocaleString('en-IN')}
        </div>
        <input type="range" min="2000" max="200000" step="500" value={form.max_budget_inr}
          onChange={e => setForm({ ...form, max_budget_inr: parseInt(e.target.value) })}
          className="w-full accent-green-600 h-2 rounded-full" />
        <div className="flex justify-between text-xs text-gray-400 mt-2"><span>₹2,000</span><span>₹2,00,000</span></div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Or type exact amount (₹)</label>
        <input type="number" min="2000" value={form.max_budget_inr}
          onChange={e => setForm({ ...form, max_budget_inr: parseInt(e.target.value) || 2000 })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
      </div>
    </div>,

    // 3 — Goals
    <div key="3" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Primary Goals</h2>
      <p className="text-gray-500 text-sm">Pick 2–3 goals that matter most to you.</p>
      <PillSelector options={GOALS} selected={form.primary_goals}
        onToggle={v => setForm({ ...form, primary_goals: v })} multi maxSelect={3} />
      <p className="text-xs text-gray-400">{form.primary_goals.length}/3 selected</p>
    </div>,

    // 4 — Power
    <div key="4" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Power Reliability</h2>
      <p className="text-gray-500 text-sm">Indoor LED crops need stable power. Mushrooms are more forgiving.</p>
      <PillSelector options={POWER} selected={form.power_reliability}
        onToggle={v => setForm({ ...form, power_reliability: v })} />
      {form.power_reliability === 'frequent' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ With frequent power cuts, indoor LED-dependent crops will be filtered out. Mushrooms and passive Kratky spinach still work.
        </div>
      )}
    </div>,

    // 5 — Effort
    <div key="5" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Daily Effort</h2>
      <p className="text-gray-500 text-sm">How much time can you realistically spend each day?</p>
      <div className="text-center py-2">
        <div className="text-5xl font-extrabold text-green-700 mb-5">{form.daily_effort_min} <span className="text-2xl font-normal text-gray-500">mins/day</span></div>
        <input type="range" min="5" max="120" step="5" value={form.daily_effort_min}
          onChange={e => setForm({ ...form, daily_effort_min: parseInt(e.target.value) })}
          className="w-full accent-green-600 h-2 rounded-full" />
        <div className="flex justify-between text-xs text-gray-400 mt-2"><span>5 mins</span><span>2 hours</span></div>
      </div>
    </div>,

    // 6 — Experience
    <div key="6" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Experience Level</h2>
      <p className="text-gray-500 text-sm">We'll match crops to your skill level.</p>
      <PillSelector options={EXP} selected={form.experience}
        onToggle={v => setForm({ ...form, experience: v })} />
    </div>,

    // 7 — Climate
    <div key="7" className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-800">Your Climate</h2>
      <p className="text-gray-500 text-sm">Used to filter crops that match without extra equipment.</p>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Typical Temperature (°C)</label>
        <input type="number" value={form.temperature_c}
          onChange={e => setForm({ ...form, temperature_c: parseFloat(e.target.value) })}
          placeholder="e.g. 28"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-lg" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Typical Humidity (%)</label>
        <input type="number" value={form.humidity_pct}
          onChange={e => setForm({ ...form, humidity_pct: parseFloat(e.target.value) })}
          placeholder="e.g. 60"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white text-lg" />
      </div>
    </div>,
  ]

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl">
          <div className="text-center mb-6">
            <span className="text-3xl font-bold text-green-700">🌿 FarmPilot</span>
            <p className="text-gray-400 text-sm mt-1">Step {step + 1} of {TOTAL}</p>
          </div>

          <ProgressDots total={TOTAL} current={step} />

          <div className="bg-white rounded-2xl shadow-md p-8 min-h-[320px] overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                variants={slide}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.25 }}
              >
                {steps[step]}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={back}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:border-green-400 hover:text-green-700 transition-colors">
                ← Back
              </button>
            )}
            {step < TOTAL - 1 ? (
              <button onClick={next}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors">
                Next →
              </button>
            ) : (
              <button onClick={finish} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors disabled:opacity-60">
                {loading ? '🔍 Finding crops...' : 'Find My Crops →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
