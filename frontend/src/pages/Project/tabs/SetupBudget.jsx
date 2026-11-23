import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import client from '../../../api/client'
import useProjectStore from '../../../store/projectStore'
import QuantityEditor from '../../../components/forms/QuantityEditor'
import ImageWithFallback from '../../../components/ui/ImageWithFallback'
import Badge from '../../../components/ui/Badge'

/**
 * Normalize the SetupResponse from the backend into the shape this component uses.
 *
 * Backend returns:
 *   { sections: SetupSection[], cost_summary: CostSummary, kit_count, expected_yield_kg, crop_name, diagram_url }
 *
 * We normalise it into:
 *   { sections: { A: SetupSection, B: SetupSection, ... },
 *     stats:    { kit_count, initial_setup_cost, cycle_cost, expected_yield_kg },
 *     cost_summary, diagram_url, crop_name }
 */
function normaliseSetupResponse(raw) {
  if (!raw) return null

  // sections: list → dict keyed by section_id
  const sectionsMap = {}
  for (const sec of raw.sections ?? []) {
    sectionsMap[sec.section_id] = sec
  }

  const stats = {
    kit_count:          raw.kit_count          ?? 0,
    initial_setup_cost: raw.cost_summary?.setup_total ?? 0,
    cycle_cost:         raw.cost_summary?.cycle_total ?? 0,
    expected_yield_kg:  raw.expected_yield_kg  ?? 0,
  }

  return {
    sections:     sectionsMap,
    stats,
    cost_summary: raw.cost_summary,
    crop_name:    raw.crop_name,
    diagram_url:  raw.diagram_url,
  }
}

function SpringNumber({ value, prefix = '₹' }) {
  const spring = useSpring(value, { stiffness: 100, damping: 20 })
  const display = useTransform(spring, (v) => `${prefix}${Math.round(v).toLocaleString('en-IN')}`)
  useEffect(() => { spring.set(value) }, [value, spring])
  return <motion.span>{display}</motion.span>
}

function StatCard({ label, value, prefix = '₹', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-1"
    >
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-green-700">
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}
      </span>
    </motion.div>
  )
}

function SectionTable({ section, items, onQtyChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
            <th className="py-2 px-3 text-left w-8">#</th>
            <th className="py-2 px-3 text-left">Item</th>
            <th className="py-2 px-3 text-center">Qty</th>
            <th className="py-2 px-3 text-right">Unit ₹</th>
            <th className="py-2 px-3 text-right">Total ₹</th>
            <th className="py-2 px-3 text-center">Link</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr
              key={item.item_id ?? idx}
              className={`border-b border-gray-50 transition-colors ${item.qty === 0 ? 'opacity-60' : ''}`}
            >
              <td className="py-3 px-3 text-gray-400 text-xs">{idx + 1}</td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={item.image_url}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className={`font-medium text-gray-800 ${item.qty === 0 ? 'line-through text-gray-400' : ''}`}>
                      {item.name}
                    </span>
                    {item.qty === 0 && <Badge label="Already own" color="grey" />}
                  </div>
                </div>
              </td>
              <td className="py-3 px-3">
                <div className="flex justify-center">
                  <QuantityEditor
                    value={item.qty}
                    onChange={(newQty) => onQtyChange(section, item.item_id, newQty)}
                  />
                </div>
              </td>
              <td className="py-3 px-3 text-right text-gray-700 tabular-nums">
                {item.unit_price != null ? `₹${Number(item.unit_price).toLocaleString('en-IN')}` : '—'}
              </td>
              <td className="py-3 px-3 text-right font-semibold text-gray-800 tabular-nums">
                {item.unit_price != null ? `₹${(item.qty * item.unit_price).toLocaleString('en-IN')}` : '—'}
              </td>
              <td className="py-3 px-3 text-center">
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
  )
}

function CollapsibleSection({ sectionKey, section, onQtyChange }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-green-700 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            {sectionKey}
          </span>
          <div className="text-left">
            <div className="font-semibold text-gray-800">{section.title}</div>
            {section.subtitle && (
              <div className="text-xs text-gray-500 mt-0.5">{section.subtitle}</div>
            )}
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <div className="border-t border-gray-100">
          <SectionTable
            section={sectionKey}
            items={section.items ?? []}
            onQtyChange={onQtyChange}
          />
        </div>
      </motion.div>
    </div>
  )
}

export default function SetupBudget() {
  const { activeProject, setupData, setSetupData } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const debounceRef = useRef({})

  useEffect(() => {
    if (!activeProject?.id) return
    setLoading(true)
    client.get(`/projects/${activeProject.id}/setup`)
      .then((res) => {
        setSetupData(normaliseSetupResponse(res.data))
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeProject?.id])

  const handleQtyChange = useCallback((section, item_id, new_qty) => {
    // Optimistic update: mutate the item qty and recalculate section totals in-place
    setSetupData((prev) => {
      if (!prev) return prev
      const updatedSection = {
        ...prev.sections[section],
        items: prev.sections[section].items.map((it) =>
          it.item_id === item_id ? { ...it, qty: new_qty, total_price: new_qty * it.unit_price } : it
        ),
      }
      updatedSection.section_total = updatedSection.items.reduce((sum, it) => sum + it.total_price, 0)

      const updatedSections = { ...prev.sections, [section]: updatedSection }

      // Recalculate summary totals from updated sections
      const setupTotal = (updatedSections['A']?.section_total ?? 0) + (updatedSections['B']?.section_total ?? 0)
      const cycleTotal = (updatedSections['C']?.section_total ?? 0) + (updatedSections['D']?.section_total ?? 0)
      const grandTotal = setupTotal + cycleTotal

      return {
        ...prev,
        sections: updatedSections,
        stats: {
          ...prev.stats,
          initial_setup_cost: setupTotal,
          cycle_cost:         cycleTotal,
        },
        cost_summary: {
          ...prev.cost_summary,
          setup_total:      setupTotal,
          cycle_total:      cycleTotal,
          grand_total:      grandTotal,
          budget_remaining: (prev.cost_summary?.budget_remaining ?? 0) + (prev.cost_summary?.grand_total ?? 0) - grandTotal,
        },
      }
    })

    const key = `${section}-${item_id}`
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key])
    debounceRef.current[key] = setTimeout(() => {
      client.put(`/projects/${activeProject.id}/setup/adjust`, [
        { section, item_id, new_qty },
      ])
        .then((res) => setSetupData(normaliseSetupResponse(res.data)))
        .catch(console.error)
    }, 400)
  }, [activeProject?.id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading setup data…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load setup data</p>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!setupData) return null

  const stats        = setupData.stats ?? {}
  const sections     = setupData.sections ?? {}
  const sectionKeys  = ['A', 'B', 'C', 'D']

  const initialCost  = stats.initial_setup_cost ?? 0
  const cycleCost    = stats.cycle_cost         ?? 0
  const grandTotal   = initialCost + cycleCost
  const budget       = activeProject?.max_budget_inr ?? 0
  const budgetLeft   = budget - grandTotal

  return (
    <div className="pb-32">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Kits"               value={stats.kit_count         ?? 0} prefix="" delay={0}    />
        <StatCard label="Initial Setup Cost" value={initialCost}                   delay={0.05} />
        <StatCard label="Cycle Cost"         value={cycleCost}                     delay={0.1}  />
        <StatCard label="Expected Yield"     value={stats.expected_yield_kg ?? 0} prefix="" delay={0.15} />
      </div>

      {/* Diagram / System Image */}
      {(setupData.diagram_url || activeProject?.image_url) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden mb-6 h-56 shadow-md"
        >
          <ImageWithFallback
            src={setupData.diagram_url ?? activeProject.image_url}
            alt={setupData.crop_name ?? activeProject?.crop_name ?? 'System diagram'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-4 left-5">
            <span className="text-white text-xl font-bold drop-shadow">
              {setupData.crop_name ?? activeProject?.crop_name}
            </span>
            <p className="text-white/70 text-sm mt-0.5">System Overview</p>
          </div>
        </motion.div>
      )}

      {/* Collapsible Sections */}
      <div className="flex flex-col gap-4">
        {sectionKeys.map((key) =>
          sections[key] ? (
            <CollapsibleSection
              key={key}
              sectionKey={key}
              section={sections[key]}
              onQtyChange={handleQtyChange}
            />
          ) : null
        )}
      </div>

      {/* Sticky Bottom Cost Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Initial Setup</span>
              <span className="font-semibold text-gray-800">
                <SpringNumber value={initialCost} />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Cycle Cost</span>
              <span className="font-semibold text-gray-800">
                <SpringNumber value={cycleCost} />
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Grand Total</span>
              <span className="font-bold text-gray-900">
                <SpringNumber value={grandTotal} />
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">Budget Left</span>
            <span className={`font-bold text-base ${budgetLeft >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              <SpringNumber value={budgetLeft} />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}