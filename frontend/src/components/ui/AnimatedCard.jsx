import { motion } from 'framer-motion'

export default function AnimatedCard({ children, delay = 0, className = '', onClick, hover = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      whileHover={hover ? { y: -4, boxShadow: '0 20px 40px rgba(45,106,79,0.15)' } : {}}
      className={`bg-white rounded-2xl shadow-md overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
