const VARIANTS = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-800',
  grey:   'bg-gray-100 text-gray-600',
  dark:   'bg-green-800 text-white',
  orange: 'bg-orange-100 text-orange-700',
}

export default function Badge({ label, color = 'green', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${VARIANTS[color] || VARIANTS.green} ${className}`}>
      {label}
    </span>
  )
}
