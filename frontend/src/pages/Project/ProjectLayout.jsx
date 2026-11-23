import { useEffect, useState } from 'react'
import { useParams, Routes, Route, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import client from '../../api/client'
import useProjectStore from '../../store/projectStore'
import Sidebar from '../../components/layout/Sidebar'
import SetupBudget from './tabs/SetupBudget'
import Solution    from './tabs/Solution'
import Timeline    from './tabs/Timeline'
import ChatBot     from './tabs/ChatBot'

const CROP_IMAGES = {
  kit_dutch_bucket_bell_pepper:   'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80',
  kit_kratky_spinach:             'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80',
  kit_lettuce_dwc_nft:            'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&q=80',
  kit_dutch_bucket_cherry_tomato: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=80',
  kit_polybag_oyster_mushroom:    'https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=400&q=80',
  kit_casing_button_mushroom:     'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&q=80',
}

export default function ProjectLayout() {
  const { id } = useParams()
  const { activeProject, setProject } = useProjectStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get(`/projects/${id}`)
      .then(r => {
        const p = { ...r.data, image_url: CROP_IMAGES[r.data.crop_id] }
        setProject(p)
      })
      .catch(() => toast.error('Could not load project'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]">
        <div className="text-gray-400 text-lg">Loading project...</div>
      </div>
    )
  }

  if (!activeProject) {
    return <Navigate to="/projects" replace />
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAF9]">
      <Sidebar project={activeProject} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="setup"    element={<SetupBudget />} />
          <Route path="solution" element={<Solution />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="bot"      element={<ChatBot />} />
          <Route path="*"        element={<Navigate to="setup" replace />} />
        </Routes>
      </main>
    </div>
  )
}
