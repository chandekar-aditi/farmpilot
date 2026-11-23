import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import client from '../../api/client'
import useAuthStore from '../../store/authStore'
import Navbar from '../../components/layout/Navbar'
import ImageWithFallback from '../../components/ui/ImageWithFallback'
import Badge from '../../components/ui/Badge'
import PillSelector from '../../components/forms/PillSelector'
import PageWrapper from '../../components/layout/PageWrapper'

const PHASE_COLORS = ['#52B788','#40916C','#2D6A4F','#1B4332','#74C69D','#52B788','#40916C','#2D6A4F']

const ENV_OPTIONS = [
  { value: 'indoor',  label: '🏠 Indoor' },
  { value: 'outdoor', label: '☀️ Outdoor' },
  { value: 'both',    label: '🌍 Both' },
]
const EXP_OPTIONS = [
  { value: 'beginner',     label: '🌱 Beginner' },
  { value: 'intermediate', label: '🌿 Intermediate' },
  { value: 'expert',       label: '🌳 Expert' },
]

export default function CropDetail() {
  const { cropId } = useParams()
  const navigate   = useNavigate()
  const user       = useAuthStore((s) => s.user)

  const [crop, setCrop]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [openPhase, setOpenPhase] = useState(0)
  const [preview, setPreview]     = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [starting, setStarting]   = useState(false)
  const [budgetWarn, setBudgetWarn] = useState('')

  // Start project form
  const [form, setForm] = useState({
    space_sqft: '', height_ft: '', environment: 'indoor',
    max_budget_inr: '', kit_count: '',
    primary_goals: [], power_reliability: 'stable',
    daily_effort_min: 30, temperature_c: 28, humidity_pct: 60,
    experience_level: user?.experience_level || 'beginner',
  })

  useEffect(() => {
    client.get(`/learn/crops/${cropId}`)
      .then(r => setCrop(r.data))
      .catch(() => toast.error('Could not load crop'))
      .finally(() => setLoading(false))
  }, [cropId])

  // Live budget preview when space + env + kit_count change
  useEffect(() => {
    if (!form.space_sqft || !form.height_ft) return
    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true)
        const { data } = await client.post(`/learn/crops/${cropId}/budget-preview`, {
          space_sqft:  parseFloat(form.space_sqft),
          height_ft:   parseFloat(form.height_ft),
          environment: form.environment,
          kit_count:   form.kit_count ? parseInt(form.kit_count) : undefined,
        })
        setPreview(data)
        if (form.max_budget_inr && parseFloat(form.max_budget_inr) < data.min_budget_1kit) {
          setBudgetWarn(`⚠️ Minimum budget for 1 kit is ₹${data.min_budget_1kit.toLocaleString('en-IN')}`)
        } else {
          setBudgetWarn('')
        }
      } catch (err) {
        setPreview(null)
      } finally {
        setPreviewLoading(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [form.space_sqft, form.height_ft, form.environment, form.kit_count])

  const startProject = async () => {
    if (!form.space_sqft || !form.height_ft || !form.max_budget_inr) {
      toast.error('Please fill in space, height, and budget')
      return
    }
    if (form.primary_goals.length < 1) {
      toast.error('Please select at least 1 goal')
      return
    }
    setStarting(true)
    try {
      const { data } = await client.post('/learn/start-project', {
        crop_id:          cropId,
        name:             `${crop.name} Farm`,
        kit_count:        preview?.kit_count || parseInt(form.kit_count) || 1,
        environment:      form.environment,
        space_sqft:       parseFloat(form.space_sqft),
        height_ft:        parseFloat(form.height_ft),
        max_budget_inr:   parseFloat(form.max_budget_inr),
        primary_goals:    form.primary_goals,
        power_reliability:form.power_reliability,
        daily_effort_min: form.daily_effort_min,
        temperature_c:    form.temperature_c,
        humidity_pct:     form.humidity_pct,
        experience_level: form.experience_level,
      })
      toast.success('Project created! 🌱')
      navigate(`/projects/${data.id}/setup`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create project')
    } finally {
      setStarting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]">
      <div className="text-gray-400">Loading crop details...</div>
    </div>
  )
  if (!crop) return null

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAF9]">
        <Navbar />

        {/* Hero */}
        <div className="relative h-96 overflow-hidden">
          <ImageWithFallback src={crop.image_url} alt={crop.name} className="w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
          <div className="absolute bottom-0 left-0 right-0 p-10">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge label={crop.difficulty} color={{ Easy:'green', Moderate:'yellow', Advanced:'orange' }[crop.difficulty]} />
                <Badge label={crop.system} color="blue" />
                {crop.environment?.map(e => <Badge key={e} label={e} color="grey" />)}
              </div>
              <h1 className="text-5xl font-extrabold text-white mb-2">{crop.name}</h1>
              <p className="text-green-200 text-lg max-w-2xl">{crop.description}</p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">

          {/* Left: crop info */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Cycle',           value: `${crop.cycle_days} days` },
                { label: 'First Harvest',   value: `Day ${crop.first_harvest_day}` },
                { label: 'Yield / Kit',     value: `${crop.yield_per_kit_kg} kg` },
                { label: 'pH Range',        value: `${crop.ph_min}–${crop.ph_max}` },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl p-5 shadow-md text-center"
                >
                  <div className="text-2xl font-extrabold text-green-700">{s.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* System diagram */}
            {crop.diagram_url && (
              <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-800 text-lg">System Diagram</h2>
                  <p className="text-sm text-gray-500">{crop.system}</p>
                </div>
                <ImageWithFallback src={crop.diagram_url} alt={`${crop.name} system`} className="w-full h-64" />
              </div>
            )}

            {/* Mixing protocol */}
            {crop.mixing_sequence?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-4">🧪 Nutrient Mixing Protocol</h2>
                <ol className="space-y-3">
                  {crop.mixing_sequence.map((step, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span className="flex-shrink-0 w-7 h-7 bg-green-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{i+1}</span>
                      <span className="text-sm text-gray-600 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                {crop.critical_rules?.length > 0 && (
                  <div className="mt-5 bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="text-sm font-semibold text-red-700 mb-2">⚠️ Critical Rules</div>
                    <ul className="space-y-1">
                      {crop.critical_rules.map((r, i) => (
                        <li key={i} className="text-sm text-red-600">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Phase timeline */}
            {crop.phases?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="font-bold text-gray-800 text-lg mb-4">📅 Growth Phases</h2>

                {/* Phase bar */}
                <div className="flex rounded-full overflow-hidden mb-6 h-3">
                  {crop.phases.map((phase, i) => {
                    const total = crop.cycle_days || 1
                    const width = ((phase.day_end - phase.day_start + 1) / total * 100).toFixed(1)
                    return (
                      <div
                        key={i}
                        style={{ width: `${width}%`, backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }}
                        title={phase.name}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setOpenPhase(openPhase === i ? -1 : i)}
                      />
                    )
                  })}
                </div>

                {/* Phase cards */}
                <div className="space-y-3">
                  {crop.phases.map((phase, i) => (
                    <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setOpenPhase(openPhase === i ? -1 : i)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PHASE_COLORS[i % PHASE_COLORS.length] }} />
                          <span className="font-semibold text-gray-800 text-sm">Phase {phase.phase_num}: {phase.name}</span>
                          <span className="text-xs text-gray-400">W{phase.week_start}–W{phase.week_end} · Day {phase.day_start}–{phase.day_end}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 font-medium">EC {phase.ec_min}–{phase.ec_max}</span>
                          <span className={`text-gray-400 text-sm transition-transform duration-200 ${openPhase === i ? 'rotate-180' : ''}`}>▾</span>
                        </div>
                      </button>

                      <AnimatePresence>
                        {openPhase === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 grid md:grid-cols-2 gap-4">
                              {/* Nutrient dose */}
                              <div>
                                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Per 20L Dose</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { label: 'Grow', val: phase.dosage_per_20L?.grow_g },
                                    { label: 'Bloom', val: phase.dosage_per_20L?.bloom_g },
                                    { label: 'Cal-Nit', val: phase.dosage_per_20L?.cal_g },
                                    { label: 'Epsom', val: phase.dosage_per_20L?.mg_g },
                                  ].map(n => n.val > 0 && (
                                    <div key={n.label} className="bg-green-50 rounded-lg p-2 text-center">
                                      <div className="text-sm font-bold text-green-700">{n.val}g</div>
                                      <div className="text-xs text-gray-400">{n.label}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Daily tasks */}
                              {phase.daily_tasks?.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Daily Tasks</div>
                                  <ul className="space-y-1">
                                    {phase.daily_tasks.slice(0, 3).map((t, j) => (
                                      <li key={j} className="text-xs text-gray-600 flex gap-2">
                                        <span className="text-green-500 flex-shrink-0">•</span>{t}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Observations */}
                              {phase.observations?.length > 0 && (
                                <div className="md:col-span-2">
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">What to Observe</div>
                                  <div className="flex flex-wrap gap-2">
                                    {phase.observations.map((o, j) => (
                                      <span key={j} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">{o}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Start project form */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-1">Start This Project</h2>
              <p className="text-sm text-gray-500 mb-5">Fill in your details to get a personalised plan.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Floor Space (sqft)</label>
                    <input type="number" min="1" value={form.space_sqft}
                      onChange={e => setForm({ ...form, space_sqft: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Ceiling Height (ft)</label>
                    <input type="number" min="1" step="0.5" value={form.height_ft}
                      onChange={e => setForm({ ...form, height_ft: e.target.value })}
                      placeholder="e.g. 7"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Environment</label>
                  <PillSelector options={ENV_OPTIONS} selected={form.environment}
                    onToggle={v => setForm({ ...form, environment: v })} />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Max Budget (₹)</label>
                  <input type="number" min="1000" value={form.max_budget_inr}
                    onChange={e => setForm({ ...form, max_budget_inr: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm" />
                  {budgetWarn && <p className="text-xs text-orange-600 mt-1">{budgetWarn}</p>}
                </div>

                {/* Budget preview card */}
                {preview && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-green-50 border border-green-200 rounded-xl p-4"
                  >
                    {previewLoading ? (
                      <div className="text-xs text-gray-400">Calculating...</div>
                    ) : (
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kits that fit</span>
                          <span className="font-bold text-green-700">{preview.kit_count} kit(s)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Setup cost</span>
                          <span className="font-semibold">₹{preview.setup_cost?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cycle cost</span>
                          <span className="font-semibold">₹{preview.cycle_cost?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between border-t border-green-200 pt-1.5">
                          <span className="text-gray-700 font-medium">Total needed</span>
                          <span className="font-bold text-green-800">₹{preview.total_cost?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected yield</span>
                          <span className="font-bold text-green-700">{preview.expected_yield_kg} kg</span>
                        </div>
                        <div className="text-xs text-gray-400">Min budget for 1 kit: ₹{preview.min_budget_1kit?.toLocaleString('en-IN')}</div>
                      </div>
                    )}
                  </motion.div>
                )}

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Goals (pick 1–3)</label>
                  <PillSelector
                    options={[
                      { value: 'home_kitchen',    label: '🥗 Home Kitchen' },
                      { value: 'commercial_sale', label: '💰 Commercial' },
                      { value: 'fast_harvest',    label: '⚡ Fast Harvest' },
                      { value: 'high_yield',      label: '📦 High Yield' },
                    ]}
                    selected={form.primary_goals}
                    onToggle={v => setForm({ ...form, primary_goals: v })}
                    multi maxSelect={3}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">Experience</label>
                  <PillSelector options={EXP_OPTIONS} selected={form.experience_level}
                    onToggle={v => setForm({ ...form, experience_level: v })} />
                </div>

                <button
                  onClick={startProject}
                  disabled={starting || !!budgetWarn}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {starting ? 'Creating project...' : 'Start This Project →'}
                </button>

                {budgetWarn && (
                  <p className="text-xs text-center text-orange-600">{budgetWarn}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
