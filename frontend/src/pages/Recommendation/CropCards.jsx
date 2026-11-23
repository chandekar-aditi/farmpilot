import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import client from '../../api/client'
import useRecommendStore from '../../store/recommendStore'
import useAuthStore from '../../store/authStore'
import ImageWithFallback from '../../components/ui/ImageWithFallback'
import Badge from '../../components/ui/Badge'
import PageWrapper from '../../components/layout/PageWrapper'

function TypeWriter({ text, speed = 25 }) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    setDisplayed('')
    if (!text) return
    let i = 0
    const timer = setInterval(() => {
      setDisplayed(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(timer)
    }, speed)
    return () => clearInterval(timer)
  }, [text])
  return <span>{displayed}</span>
}

function CropCard({ rec, rank, onStart, loading }) {
  const rankColors = { 1: 'dark', 2: 'green', 3: 'blue' }
  const rankLabels = { 1: '#1 Best Match', 2: '#2 Great Fit', 3: '#3 Good Option' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: (rank - 1) * 0.12 }}
      whileHover={{ y: -6 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative">
        <ImageWithFallback src={rec.image_url} alt={rec.name} className="w-full h-52" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute top-3 left-3">
          <Badge label={rankLabels[rank]} color={rankColors[rank]} />
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white">{rec.name}</h3>
          <p className="text-sm text-green-200">{rec.system}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-green-700">{rec.expected_yield_kg}kg</div>
            <div className="text-xs text-gray-500">Yield</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-blue-700">{rec.cycle_days}d</div>
            <div className="text-xs text-gray-500">Cycle</div>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <div className="text-sm font-bold text-orange-700">₹{(rec.estimated_setup_cost + rec.estimated_cycle_cost).toLocaleString('en-IN')}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>

        {/* AI explanation */}
        {rec.ai_explanation && (
          <div className="bg-green-50 rounded-xl p-4 text-sm text-green-800 italic leading-relaxed border border-green-100">
            <span className="text-xs font-semibold text-green-600 not-italic block mb-1">🤖 AI says</span>
            <TypeWriter text={rec.ai_explanation} speed={18} />
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {rec.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{tag.replace(/_/g, ' ')}</span>
          ))}
        </div>

        <button
          onClick={() => onStart(rec)}
          disabled={loading}
          className="mt-auto w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {loading ? 'Starting...' : 'Start This Project →'}
        </button>
      </div>
    </motion.div>
  )
}

export default function CropCards() {
  const navigate = useNavigate()
  const { recommendations, wizardAnswers } = useRecommendStore()
  const user = useAuthStore((s) => s.user)
  const [starting, setStarting] = useState(null)

  useEffect(() => {
    if (!recommendations) navigate('/onboarding')
  }, [recommendations])

  if (!recommendations) return null

  const { top_3, also_consider, wizard_summary } = recommendations

  const startProject = async (rec) => {
    setStarting(rec.crop_id)
    try {
      const { data } = await client.post('/projects', {
        name:              `${rec.name} Farm`,
        crop_id:           rec.crop_id,
        crop_name:         rec.name,
        kit_count:         rec.kit_count,
        environment:       wizardAnswers.environment,
        space_sqft:        wizardAnswers.space_sqft,
        height_ft:         wizardAnswers.height_ft,
        max_budget_inr:    wizardAnswers.max_budget_inr,
        primary_goals:     wizardAnswers.primary_goals,
        power_reliability: wizardAnswers.power_reliability,
        daily_effort_min:  wizardAnswers.daily_effort_min,
        temperature_c:     wizardAnswers.temperature_c,
        humidity_pct:      wizardAnswers.humidity_pct,
        experience_level:  wizardAnswers.experience,
      })
      toast.success('Project created! 🌱')
      navigate(`/projects/${data.id}/setup`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create project')
    } finally {
      setStarting(null)
    }
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAF9] pt-10 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-4xl font-bold text-green-900 mb-2">Your Crop Recommendations</h1>
            <p className="text-gray-500">Based on your {wizard_summary.space_sqft}sqft, {wizard_summary.environment} space with ₹{wizard_summary.max_budget_inr?.toLocaleString('en-IN')} budget</p>
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {[
                `${wizard_summary.space_sqft} sq ft`,
                wizard_summary.environment,
                `₹${wizard_summary.max_budget_inr?.toLocaleString('en-IN')}`,
                wizard_summary.experience,
                ...(wizard_summary.primary_goals || []).map(g => g.replace(/_/g,' ')),
              ].map((chip, i) => (
                <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">{chip}</span>
              ))}
            </div>
          </motion.div>

          {/* Top 3 */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {top_3.map((rec, i) => (
              <CropCard
                key={rec.crop_id}
                rec={rec}
                rank={i + 1}
                onStart={startProject}
                loading={starting === rec.crop_id}
              />
            ))}
          </div>

          {/* Also consider */}
          {also_consider?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-700 mb-4">Also Consider</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {also_consider.map((rec, i) => (
                  <motion.div
                    key={rec.crop_id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="bg-white rounded-2xl shadow p-4 flex gap-4 items-center hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => startProject(rec)}
                  >
                    <ImageWithFallback src={rec.image_url} alt={rec.name} className="w-16 h-16 rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{rec.name}</div>
                      <div className="text-xs text-gray-500">{rec.cycle_days} days · {rec.expected_yield_kg}kg</div>
                      <div className="text-xs text-green-600 font-medium mt-0.5">₹{(rec.estimated_setup_cost + rec.estimated_cycle_cost).toLocaleString('en-IN')}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
