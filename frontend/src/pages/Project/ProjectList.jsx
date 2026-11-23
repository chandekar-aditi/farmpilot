import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import client from '../../api/client'
import Navbar from '../../components/layout/Navbar'
import ImageWithFallback from '../../components/ui/ImageWithFallback'
import Badge from '../../components/ui/Badge'
import PageWrapper from '../../components/layout/PageWrapper'

const CROP_IMAGES = {
  kit_dutch_bucket_bell_pepper:   'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80',
  kit_kratky_spinach:             'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80',
  kit_lettuce_dwc_nft:            'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&q=80',
  kit_dutch_bucket_cherry_tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=80',
  kit_polybag_oyster_mushroom:    'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=400&q=80',
  kit_casing_button_mushroom:     'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80',
}

export default function ProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    client.get('/projects')
      .then(r => setProjects(r.data))
      .catch(() => toast.error('Could not load projects'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAF9]">
        <Navbar />
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-green-900">My Projects</h1>
              <p className="text-gray-500 mt-1">{projects.length} active farm{projects.length !== 1 ? 's' : ''}</p>
            </div>
            <Link
              to="/onboarding"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
            >
              + New Project
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading your projects...</div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🌱</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">Start by telling us about your space and we'll recommend the perfect crop.</p>
              <Link to="/onboarding" className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors">
                Plan My First Farm →
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(45,106,79,0.15)' }}
                  onClick={() => navigate(`/projects/${p.id}/setup`)}
                  className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer"
                >
                  <ImageWithFallback
                    src={CROP_IMAGES[p.crop_id] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'}
                    alt={p.crop_name}
                    className="w-full h-40"
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="font-bold text-gray-800">{p.name}</h3>
                      <Badge label={p.status} color={p.status === 'active' ? 'green' : 'grey'} />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">{p.crop_name} · {p.kit_count} kit(s) · {p.environment}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-green-700">{p.expected_yield_kg}kg</div>
                        <div className="text-xs text-gray-400">Yield</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <div className="text-sm font-bold text-blue-700">{p.cycle_days}d</div>
                        <div className="text-xs text-gray-400">Cycle</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2">
                        <div className="text-xs font-bold text-orange-700">₹{(p.setup_cost_inr + p.cycle_cost_inr).toLocaleString('en-IN')}</div>
                        <div className="text-xs text-gray-400">Total</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}
