import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import client from '../../../api/client'
import useProjectStore from '../../../store/projectStore'
import ImageWithFallback from '../../../components/ui/ImageWithFallback'
import Badge from '../../../components/ui/Badge'

const HEADER_IMAGE = 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80'

function StepCard({ step, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="bg-white rounded-2xl shadow-md p-5 flex gap-4"
    >
      <div className="flex-shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white ${step.is_critical ? 'bg-red-500' : 'bg-green-600'}`}>
          {step.step_num}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-gray-800 text-sm leading-relaxed flex-1">{step.instruction}</p>
          {step.product_image_url && (
            <ImageWithFallback
              src={step.product_image_url}
              alt="Product"
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          )}
        </div>
        {step.is_critical && (
          <div className="mt-2">
            <Badge label="⚠️ Critical" color="red" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

function PhaseNutrientCard({ phase, index }) {
  // phase shape (from backend PhaseNutrientCard schema):
  //   phase_num, name, week_start, week_end, day_start, day_end,
  //   dosage_per_20L { grow_g, bloom_g, cal_g, mg_g },
  //   your_dosage    { grow_g, bloom_g, cal_g, mg_g },
  //   your_reservoir_L, ec_min, ec_max, tds_min, tds_max, notes[]
  const weekRange = `W${phase.week_start}–W${phase.week_end} (Day ${phase.day_start}–${phase.day_end})`
  const ecTds     = `EC ${phase.ec_min}–${phase.ec_max} mS/cm  |  TDS ${phase.tds_min}–${phase.tds_max} ppm`

  const nutrientRows = [
    { name: 'NPK Grow',         base: `${phase.dosage_per_20L.grow_g}g`,  yours: `${phase.your_dosage.grow_g}g`  },
    { name: 'NPK Bloom',        base: `${phase.dosage_per_20L.bloom_g}g`, yours: `${phase.your_dosage.bloom_g}g` },
    { name: 'Calcium Nitrate',  base: `${phase.dosage_per_20L.cal_g}g`,   yours: `${phase.your_dosage.cal_g}g`   },
    { name: 'Epsom Salt (MgSO₄)', base: `${phase.dosage_per_20L.mg_g}g`, yours: `${phase.your_dosage.mg_g}g`    },
  ].filter((r) => parseFloat(r.base) > 0 || parseFloat(r.yours) > 0)

  return (
    <motion.div
      id={`phase-${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden"
    >
      <div className="bg-gradient-to-r from-green-700 to-green-500 px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-base">
            Phase {phase.phase_num}: {phase.name}
          </h3>
          <p className="text-green-100 text-xs mt-0.5">{weekRange}</p>
        </div>
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
          {ecTds}
        </span>
      </div>

      {nutrientRows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-2 px-4 text-left">Nutrient</th>
                <th className="py-2 px-4 text-right">Base 20L dose</th>
                <th className="py-2 px-4 text-right">
                  Your reservoir ({phase.your_reservoir_L}L) dose
                </th>
              </tr>
            </thead>
            <tbody>
              {nutrientRows.map((n, ni) => (
                <tr key={ni} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-800">{n.name}</td>
                  <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{n.base}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-700 tabular-nums">{n.yours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {phase.notes && phase.notes.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100 flex flex-col gap-1">
          {phase.notes.map((note, ni) => (
            <p key={ni} className="text-xs text-gray-500">• {note}</p>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function WhatToBuyTable({ items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">What to Buy</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
              <th className="py-2 px-4 text-left">Product</th>
              <th className="py-2 px-4 text-right">Grams needed</th>
              <th className="py-2 px-4 text-right">Packs</th>
              <th className="py-2 px-4 text-right">Price ₹</th>
              <th className="py-2 px-4 text-right">Total ₹</th>
              <th className="py-2 px-4 text-center">Link</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {item.image_url && (
                      <ImageWithFallback
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                      />
                    )}
                    <span className="font-medium text-gray-800">{item.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-gray-600 tabular-nums">
                  {item.total_grams_needed > 0 ? `${item.total_grams_needed}g` : '—'}
                </td>
                <td className="py-3 px-4 text-right text-gray-600 tabular-nums">
                  {item.packs_to_buy ?? '—'}
                </td>
                <td className="py-3 px-4 text-right text-gray-600 tabular-nums">
                  {item.pack_price != null ? `₹${Number(item.pack_price).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-800 tabular-nums">
                  {item.total_price != null ? `₹${Number(item.total_price).toLocaleString('en-IN')}` : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors"
                    >
                      Buy
                    </a>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Solution() {
  const { activeProject, solutionData, setSolutionData } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activePhase, setActivePhase] = useState(0)

  useEffect(() => {
    if (!activeProject?.id) return
    setLoading(true)
    client.get(`/projects/${activeProject.id}/solution`)
      .then((res) => {
        setSolutionData(res.data)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeProject?.id])

  const scrollToPhase = (index) => {
    setActivePhase(index)
    const el = document.getElementById(`phase-${index}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading solution guide…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load solution guide</p>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!solutionData) return null

  // Field names match the backend SolutionResponse schema exactly:
  //   mixing_steps, phase_cards, buy_list, total_nutrient_cost, crop_name
  const steps    = solutionData.mixing_steps  ?? []
  const phases   = solutionData.phase_cards   ?? []
  const buyItems = solutionData.buy_list      ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Header image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden h-52 shadow-md"
      >
        <ImageWithFallback
          src={HEADER_IMAGE}
          alt="Solution Guide"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-5 left-6">
          <h1 className="text-white text-2xl font-bold drop-shadow">Solution & Nutrient Guide</h1>
          <p className="text-white/70 text-sm mt-1">{activeProject?.crop_name}</p>
        </div>
      </motion.div>

      {/* Mixing Protocol */}
      {steps.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Mixing Protocol</h2>
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <StepCard key={i} step={step} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Phase Selector Pills */}
      {phases.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Nutrient Phases</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {phases.map((phase, i) => (
              <button
                key={i}
                onClick={() => scrollToPhase(i)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activePhase === i
                    ? 'bg-green-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                Phase {phase.phase_num}: {phase.name}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {phases.map((phase, i) => (
              <PhaseNutrientCard key={i} phase={phase} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* What to Buy */}
      <WhatToBuyTable items={buyItems} />

      {/* Total cost footer */}
      {solutionData.total_nutrient_cost > 0 && (
        <div className="bg-green-50 rounded-2xl px-6 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Nutrient Cost (full cycle)</span>
          <span className="text-lg font-bold text-green-700">
            ₹{Number(solutionData.total_nutrient_cost).toLocaleString('en-IN')}
          </span>
        </div>
      )}
    </div>
  )
}