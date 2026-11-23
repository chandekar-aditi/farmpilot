import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCircle, Circle, ChevronDown, Trash2 } from 'lucide-react'
import client from '../../../api/client'
import useProjectStore from '../../../store/projectStore'
import ImageWithFallback from '../../../components/ui/ImageWithFallback'
import Badge from '../../../components/ui/Badge'
import SlidePanel from '../../../components/ui/SlidePanel'

const HEADER_IMAGE = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80'

const PHASE_COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-orange-500', 'bg-purple-500', 'bg-teal-500',
]
const PHASE_DOT_COLORS = [
  'bg-blue-400', 'bg-green-400', 'bg-yellow-400',
  'bg-orange-400', 'bg-purple-400', 'bg-teal-400',
]
const PHASE_TEXT_COLORS = [
  'text-blue-700', 'text-green-700', 'text-yellow-700',
  'text-orange-700', 'text-purple-700', 'text-teal-700',
]

function PhaseProgressBar({ phases, currentPhaseIndex }) {
  if (!phases || phases.length === 0) return null
  const totalDays = phases.reduce((acc, p) => acc + ((p.day_end ?? 0) - (p.day_start ?? 0) + 1), 0)

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Growth Progress</h2>
      <div className="flex rounded-full overflow-hidden h-5 gap-0.5">
        {phases.map((phase, i) => {
          const days = (phase.day_end ?? 0) - (phase.day_start ?? 0) + 1
          const pct = totalDays > 0 ? (days / totalDays) * 100 : 0
          const isCurrent = i === currentPhaseIndex
          const isDone = i < currentPhaseIndex
          return (
            <div
              key={i}
              style={{ width: `${pct}%` }}
              className={`relative ${PHASE_COLORS[i % PHASE_COLORS.length]} ${isCurrent ? 'ring-2 ring-offset-1 ring-green-700' : ''} flex items-center justify-center`}
              title={phase.phase_name}
            >
              {isDone && (
                <span className="text-white text-xs font-bold">✓</span>
              )}
              {isCurrent && (
                <span className="absolute inset-0 rounded-sm animate-pulse opacity-50 bg-white" />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {phases.map((phase, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${PHASE_DOT_COLORS[i % PHASE_DOT_COLORS.length]}`} />
            <span className="text-xs text-gray-600">{phase.phase_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskRow({ task, phaseIndex, phaseDayStart, projectId, onReminderSaved }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [form, setForm] = useState({
    task_text: task.task ?? task.text ?? '',
    cycle_day: phaseDayStart ?? 1,
    reminder_type: 'daily',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await client.post(`/projects/${projectId}/reminders`, form)
      setPanelOpen(false)
      onReminderSaved()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const taskText = task.task ?? task.text ?? ''

  return (
    <>
      <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Circle size={16} className="text-gray-300 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">{taskText}</span>
        </div>
        {task.has_reminder ? (
          <Bell size={16} className="text-green-600 flex-shrink-0 ml-2" />
        ) : (
          <button
            onClick={() => setPanelOpen(true)}
            className="ml-2 flex-shrink-0 text-xs text-green-700 hover:text-green-900 font-medium px-2 py-1 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap"
          >
            + Reminder
          </button>
        )}
      </div>

      <SlidePanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Set Reminder"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Task</label>
            <textarea
              value={form.task_text}
              onChange={(e) => setForm((f) => ({ ...f, task_text: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Cycle Day</label>
            <input
              type="number"
              value={form.cycle_day}
              onChange={(e) => setForm((f) => ({ ...f, cycle_day: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Reminder Type</label>
            <select
              value={form.reminder_type}
              onChange={(e) => setForm((f) => ({ ...f, reminder_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Optional notes…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Reminder'}
          </button>
        </div>
      </SlidePanel>
    </>
  )
}

function PhaseCard({ phase, phaseIndex, projectId, onReminderSaved }) {
  const [open, setOpen] = useState(false)
  const [innerTab, setInnerTab] = useState('daily')

  const dailyTasks = phase.daily_tasks ?? []
  const weeklyTasks = phase.weekly_tasks ?? []
  const observations = phase.observations ?? []

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${PHASE_DOT_COLORS[phaseIndex % PHASE_DOT_COLORS.length]}`} />
          <div className="text-left">
            <span className="font-semibold text-gray-800">{phase.phase_name}</span>
            <div className="flex gap-3 mt-0.5">
              {phase.week_range && (
                <span className="text-xs text-gray-500">{phase.week_range}</span>
              )}
              {(phase.day_start != null && phase.day_end != null) && (
                <span className="text-xs text-gray-400">Day {phase.day_start}–{phase.day_end}</span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="border-t border-gray-100 px-6 pt-4 pb-5">
              {/* Inner Tab Bar */}
              <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
                {['daily', 'weekly', 'observe'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setInnerTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                      innerTab === tab ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'observe' ? 'Observe' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {innerTab === 'daily' && (
                <div>
                  {dailyTasks.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2">No daily tasks for this phase.</p>
                  ) : (
                    dailyTasks.map((task, i) => (
                      <TaskRow
                        key={i}
                        task={task}
                        phaseIndex={phaseIndex}
                        phaseDayStart={phase.day_start}
                        projectId={projectId}
                        onReminderSaved={onReminderSaved}
                      />
                    ))
                  )}
                </div>
              )}

              {innerTab === 'weekly' && (
                <div>
                  {weeklyTasks.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2">No weekly tasks for this phase.</p>
                  ) : (
                    weeklyTasks.map((task, i) => (
                      <TaskRow
                        key={i}
                        task={task}
                        phaseIndex={phaseIndex}
                        phaseDayStart={phase.day_start}
                        projectId={projectId}
                        onReminderSaved={onReminderSaved}
                      />
                    ))
                  )}
                </div>
              )}

              {innerTab === 'observe' && (
                <div className="flex flex-col gap-2">
                  {observations.length === 0 ? (
                    <p className="text-gray-400 text-sm py-2">No observations for this phase.</p>
                  ) : (
                    observations.map((obs, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle size={15} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{typeof obs === 'string' ? obs : obs.text ?? obs.observation ?? JSON.stringify(obs)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function RemindersPanel({ projectId, isOpen, onClose }) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !projectId) return
    setLoading(true)
    client.get(`/projects/${projectId}/reminders`)
      .then((res) => setReminders(res.data?.reminders ?? res.data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isOpen, projectId])

  const handleToggle = async (reminder) => {
    try {
      await client.put(`/reminders/${reminder.id}`, { done: !reminder.done })
      setReminders((prev) =>
        prev.map((r) => r.id === reminder.id ? { ...r, done: !r.done } : r)
      )
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id) => {
    try {
      await client.delete(`/reminders/${id}`)
      setReminders((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title="My Reminders" width="w-[420px]">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Bell size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reminders set yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="bg-gray-50 rounded-xl p-4 flex items-start gap-3"
            >
              <button onClick={() => handleToggle(r)} className="mt-0.5 flex-shrink-0">
                {r.done
                  ? <CheckCircle size={18} className="text-green-600" />
                  : <Circle size={18} className="text-gray-300" />
                }
              </button>
              <div className="flex-1 min-w-0">
                {r.phase_name && (
                  <Badge label={r.phase_name} color="green" className="mb-1" />
                )}
                <p className={`text-sm text-gray-800 ${r.done ? 'line-through text-gray-400' : ''}`}>
                  {r.task_text}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Day {r.cycle_day} · {r.reminder_type}
                </p>
                {r.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">{r.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SlidePanel>
  )
}

export default function Timeline() {
  const { activeProject, timelineData, setTimelineData } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [remindersOpen, setRemindersOpen] = useState(false)

  const fetchTimeline = useCallback(() => {
    if (!activeProject?.id) return
    client.get(`/projects/${activeProject.id}/timeline`)
      .then((res) => {
        setTimelineData(res.data)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [activeProject?.id])

  useEffect(() => {
    setLoading(true)
    fetchTimeline()
  }, [fetchTimeline])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <span className="text-gray-500 text-sm">Loading timeline…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load timeline</p>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!timelineData) return null

  const phases = timelineData.phases ?? []
  const currentPhaseIndex = timelineData.current_phase_index ?? 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden h-52 shadow-md"
      >
        <ImageWithFallback
          src={HEADER_IMAGE}
          alt="Growth Timeline"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-5 left-6 flex-1">
          <h1 className="text-white text-2xl font-bold drop-shadow">Growth Timeline</h1>
          <p className="text-white/70 text-sm mt-1">{activeProject?.crop_name}</p>
        </div>
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setRemindersOpen(true)}
            className="flex items-center gap-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Bell size={15} />
            My Reminders
          </button>
        </div>
      </motion.div>

      {/* Phase Progress Bar */}
      <PhaseProgressBar phases={phases} currentPhaseIndex={currentPhaseIndex} />

      {/* Phase Cards */}
      <div className="flex flex-col gap-4">
        {phases.map((phase, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <PhaseCard
              phase={phase}
              phaseIndex={i}
              projectId={activeProject?.id}
              onReminderSaved={fetchTimeline}
            />
          </motion.div>
        ))}
      </div>

      {/* Reminders Panel */}
      <RemindersPanel
        projectId={activeProject?.id}
        isOpen={remindersOpen}
        onClose={() => setRemindersOpen(false)}
      />
    </div>
  )
}
