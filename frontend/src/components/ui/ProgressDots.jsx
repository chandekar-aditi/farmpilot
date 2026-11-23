export default function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current
              ? 'w-3 h-3 bg-green-600'
              : i === current
              ? 'w-4 h-4 bg-green-500 ring-2 ring-green-300 ring-offset-1'
              : 'w-3 h-3 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}
