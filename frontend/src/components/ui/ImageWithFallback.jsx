import { useState } from 'react'

export default function ImageWithFallback({ src, alt, className = '' }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError]   = useState(false)

  if (error) {
    return (
      <div className={`${className} bg-green-800 flex items-center justify-center`}>
        <span className="text-5xl">🌱</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      className={`${className} object-cover transition-all duration-500 ${loaded ? 'img-loaded' : 'img-loading'}`}
    />
  )
}
