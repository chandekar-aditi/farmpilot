import { motion, AnimatePresence } from 'framer-motion'

export default function SlidePanel({ isOpen, onClose, title, children, side = 'right', width = 'w-96' }) {
  const variants = {
    right:  { hidden: { x: '100%' },  visible: { x: 0 } },
    bottom: { hidden: { y: '100%' },  visible: { y: 0 } },
  }
  const v = variants[side]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.div
            initial={v.hidden} animate={v.visible} exit={v.hidden}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed z-50 bg-white shadow-2xl
              ${side === 'right'
                ? `right-0 top-0 h-full ${width} rounded-l-2xl`
                : 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]'
              }`}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="overflow-y-auto h-full pb-16 p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
