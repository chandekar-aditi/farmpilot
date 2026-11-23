import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from '../components/layout/Navbar'
import ImageWithFallback from '../components/ui/ImageWithFallback'

const CROPS = [
  { name: 'Bell Pepper',    days: '210 days', img: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80' },
  { name: 'Spinach',        days: '30 days',  img: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80' },
  { name: 'Lettuce',        days: '40 days',  img: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&q=80' },
  { name: 'Cherry Tomato',  days: '180 days', img: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=80' },
  { name: 'Oyster Mushroom',days: '30 days',  img: 'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=400&q=80' },
  { name: 'Button Mushroom',days: '45 days',  img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80' },
]

const STEPS = [
  { icon: '📐', title: 'Tell us your space', desc: 'Enter floor area, height, budget, goals, and environment.' },
  { icon: '🤖', title: 'AI picks your crop', desc: 'Our engine hard-filters and ranks all 6 crops for your profile.' },
  { icon: '📋', title: 'Get your full plan', desc: 'Budget breakdown, nutrient guide, timeline, and a live bot.' },
]

const FEATURES = [
  { icon: '💰', title: 'Dynamic Budget Engine',      desc: 'Every kit, add-on, nutrient, and seed calculated under your budget with live adjustment.' },
  { icon: '🧪', title: 'Nutrient Solution Guide',    desc: 'Phase-wise dosage scaled to your exact reservoir volume. No guesswork.' },
  { icon: '📅', title: 'Phase-by-Phase Timeline',    desc: 'Daily and weekly checklists for every growth phase with custom reminders.' },
  { icon: '🤖', title: 'Personalised Farm Bot',      desc: 'RAG-powered bot that knows your farm, phase, activities, and history.' },
]

function FadeUp({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8FAF9]">
      <Navbar transparent />

      {/* ── Hero ── */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
          alt="Indoor vertical farm"
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/70 via-green-900/55 to-green-900/70" />
        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block bg-green-500/20 border border-green-400/30 text-green-200 text-sm px-4 py-1.5 rounded-full mb-6"
          >
            🌱 AI-Powered Hydroponic Planning
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl md:text-7xl font-extrabold text-white mb-6 leading-tight"
          >
            Grow Smarter.<br />Harvest More.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-xl text-green-100 mb-10 max-w-2xl mx-auto"
          >
            AI-powered crop planning for your exact space, budget, and skill level. From first seed to harvest.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex gap-4 justify-center flex-wrap"
          >
            <Link
              to="/signup"
              className="px-8 py-4 bg-green-500 hover:bg-green-400 text-white text-lg font-semibold rounded-full shadow-xl transition-all hover:scale-105"
            >
              Plan My Farm →
            </Link>
            <Link
              to="/learn"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-lg font-semibold rounded-full transition-all"
            >
              Learn & Grow
            </Link>
          </motion.div>
        </div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-2xl"
        >↓</motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2 className="text-4xl font-bold text-green-900 text-center mb-2">How It Works</h2>
            <p className="text-gray-500 text-center mb-14">Three steps from idea to harvest</p>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-8 shadow-md text-center hover:shadow-lg transition-shadow">
                  <div className="text-5xl mb-4">{s.icon}</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Crop strip ── */}
      <section className="py-16 bg-green-800">
        <div className="max-w-6xl mx-auto px-6">
          <FadeUp>
            <h2 className="text-3xl font-bold text-white text-center mb-10">6 Crops Supported</h2>
          </FadeUp>
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin">
            {CROPS.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex-shrink-0 w-44 rounded-2xl overflow-hidden bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
              >
                <ImageWithFallback src={c.img} alt={c.name} className="w-full h-32" />
                <div className="p-3">
                  <div className="text-white font-semibold text-sm">{c.name}</div>
                  <div className="text-green-300 text-xs mt-0.5">{c.days}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeUp>
            <h2 className="text-4xl font-bold text-green-900 text-center mb-2">Why FarmPilot</h2>
            <p className="text-gray-500 text-center mb-14">Everything you need to grow with confidence</p>
          </FadeUp>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <FadeUp key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-7 shadow-md flex gap-5 items-start hover:shadow-lg transition-shadow">
                  <div className="text-4xl flex-shrink-0">{f.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-r from-green-700 to-green-600 text-center px-6">
        <FadeUp>
          <h2 className="text-4xl font-bold text-white mb-4">Ready to start your farm?</h2>
          <p className="text-green-200 mb-8 text-lg">Join growers who plan smarter with FarmPilot AI.</p>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 bg-white text-green-800 text-lg font-bold rounded-full hover:bg-green-50 transition-all hover:scale-105 shadow-xl"
          >
            Get Started Free →
          </Link>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-green-900 text-green-300 text-center py-10 px-6">
        <div className="text-2xl font-bold text-white mb-2">🌿 FarmPilot</div>
        <p className="text-sm">Precision vertical farming, powered by AI.</p>
        <p className="text-xs mt-4 text-green-600">© 2026 FarmPilot. All rights reserved.</p>
      </footer>
    </div>
  )
}
