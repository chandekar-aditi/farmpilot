import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, CalendarDays, Bot, PlusCircle, BookOpen } from 'lucide-react'
import ImageWithFallback from '../ui/ImageWithFallback'

const NAV = [
  { to: 'setup',    icon: LayoutDashboard, label: 'Setup & Budget' },
  { to: 'solution', icon: FlaskConical,    label: 'Solution Guide' },
  { to: 'timeline', icon: CalendarDays,    label: 'Timeline'       },
  { to: 'bot',      icon: Bot,             label: 'Farm Bot'       },
]

export default function Sidebar({ project }) {
  if (!project) return null

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Crop image + info */}
      <div className="p-4 border-b border-gray-100">
        <ImageWithFallback
          src={project.image_url || `https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80`}
          alt={project.crop_name}
          className="w-full h-36 rounded-xl"
        />
        <h2 className="font-bold text-gray-800 mt-3 text-sm">{project.name}</h2>
        <p className="text-xs text-gray-500">{project.crop_name} · {project.kit_count} kit(s)</p>
        <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
          project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>{project.status}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-green-50 text-green-700 border-l-4 border-green-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer links */}
      <div className="p-3 border-t border-gray-100 space-y-1">
        <NavLink to="/learn" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors">
          <BookOpen size={16} />Learn & Grow
        </NavLink>
        <NavLink to="/projects" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-green-700 hover:bg-green-50 transition-colors">
          <PlusCircle size={16} />All Projects
        </NavLink>
      </div>
    </aside>
  )
}
