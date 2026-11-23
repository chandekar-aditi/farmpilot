import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import client from '../../api/client'
import Navbar from '../../components/layout/Navbar'
import ImageWithFallback from '../../components/ui/ImageWithFallback'
import Badge from '../../components/ui/Badge'
import PageWrapper from '../../components/layout/PageWrapper'

const DIFF_COLOR = { Easy: 'green', Moderate: 'yellow', Advanced: 'orange' }

export default function LearnPage() {
  const navigate = useNavigate()
  const [crops, setCrops]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/learn/crops')
      .then(r => setCrops(r.data))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAF9]">
        <Navbar />

        {/* Hero */}
        <div className="relative h-72 overflow-hidden">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80"
            alt="Farm"
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-green-900/60 flex flex-col items-center justify-center text-center px-6">
            <motion.h1
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-extrabold text-white mb-2"
            >Learn & Grow</motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-green-200 text-lg max-w-xl"
            >Explore every crop in detail — phases, nutrients, yield, and system setup. Then start your project directly.</motion.p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold text-green-900 mb-6">All 6 Supported Crops</h2>

          {loading ? (
            <div className="text-center py-20 text-gray-400">Loading crops...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {crops.map((crop, i) => (
                <motion.div
                  key={crop.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(45,106,79,0.15)' }}
                  onClick={() => navigate(`/learn/${crop.id}`)}
                  className="bg-white rounded-2xl shadow-md overflow-hidden cursor-pointer"
                >
                  {/* Image */}
                  <div className="relative">
                    <ImageWithFallback src={crop.image_url} alt={crop.name} className="w-full h-48" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-3 right-3">
                      <Badge label={crop.difficulty} color={DIFF_COLOR[crop.difficulty] || 'grey'} />
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <h3 className="text-lg font-bold text-white">{crop.name}</h3>
                      <p className="text-sm text-green-200">{crop.system}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{crop.description}</p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center bg-green-50 rounded-xl p-2">
                        <div className="font-bold text-green-700 text-sm">{crop.yield_per_kit_kg}kg</div>
                        <div className="text-xs text-gray-400">per kit</div>
                      </div>
                      <div className="text-center bg-blue-50 rounded-xl p-2">
                        <div className="font-bold text-blue-700 text-sm">{crop.cycle_days}d</div>
                        <div className="text-xs text-gray-400">cycle</div>
                      </div>
                      <div className="text-center bg-orange-50 rounded-xl p-2">
                        <div className="font-bold text-orange-700 text-xs">₹{crop.min_budget_inr?.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-gray-400">min budget</div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {crop.tags?.slice(0, 3).map(t => (
                        <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{t.replace(/_/g,' ')}</span>
                      ))}
                    </div>

                    <button className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors">
                      Explore Crop →
                    </button>
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
