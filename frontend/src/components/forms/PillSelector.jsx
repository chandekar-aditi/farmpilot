export default function PillSelector({ options, selected, onToggle, multi = false, maxSelect = null }) {
  const isSelected = (val) => multi ? (selected || []).includes(val) : selected === val

  const handle = (val) => {
    if (!multi) { onToggle(val); return }
    const cur = selected || []
    if (isSelected(val)) { onToggle(cur.filter(v => v !== val)); return }
    if (maxSelect && cur.length >= maxSelect) return
    onToggle([...cur, val])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const val   = typeof opt === 'string' ? opt : opt.value
        const label = typeof opt === 'string' ? opt : opt.label
        const icon  = typeof opt === 'object' ? opt.icon  : ''
        const sel   = isSelected(val)
        return (
          <button
            key={val} type="button" onClick={() => handle(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${
              sel
                ? 'bg-green-600 border-green-600 text-white shadow-md scale-105'
                : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'
            }`}
          >
            {icon && <span className="mr-1">{icon}</span>}{label}
          </button>
        )
      })}
    </div>
  )
}
