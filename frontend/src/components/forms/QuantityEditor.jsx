import { motion, AnimatePresence } from 'framer-motion'

export default function QuantityEditor({ value, onChange, min = 0, max = 99 }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 font-bold text-sm transition-colors flex items-center justify-center"
      >−</button>

      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={{ duration: 0.12 }}
          className={`w-9 text-center text-sm font-semibold tabular-nums ${value === 0 ? 'text-gray-400' : 'text-gray-800'}`}
        >
          {value}
        </motion.span>
      </AnimatePresence>

      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 font-bold text-sm transition-colors flex items-center justify-center"
      >+</button>

      {value === 0 && (
        <span className="ml-1 text-xs text-gray-400 italic">own</span>
      )}
    </div>
  )
}
