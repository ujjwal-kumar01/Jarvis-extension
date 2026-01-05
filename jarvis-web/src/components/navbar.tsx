'use client'

import React, { useEffect, useRef } from 'react'

export default function Navbar() {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
  const img = imgRef.current
  if (!img) return

  // ✅ Initial centered state
  img.style.transform = `
    translate(-50%, -50%)
    translate3d(0px, 0px, 0)
    scale3d(1.05, 1.05, 1)
    rotateX(0deg)
    rotateY(0deg)
  `

interface MouseMoveEvent extends MouseEvent {}

const handleMouseMove = (e: MouseMoveEvent): void => {
    const x = (e.clientX / window.innerWidth - 0.5) * 16
    const y = (e.clientY / window.innerHeight - 0.5) * 16

    const target = img as HTMLImageElement | null
    if (!target) return

    target.style.transform = `
        translate(-50%, -50%)
        translate3d(${x}px, ${y}px, 0)
        scale3d(1.05, 1.05, 1)
        rotateX(${-y}deg)
        rotateY(${x}deg)
    `
}

  window.addEventListener('mousemove', handleMouseMove)
  return () => window.removeEventListener('mousemove', handleMouseMove)
}, [])


  return (
    <div className="hero">
      {/* soft glow */}
      <div className="glow" />

      <img
        ref={imgRef}
        src="https://cdn.prod.website-files.com/63e36d09413f83c58ac5d998/64015d6c1131155d558000ed_Large%20Grid.svg"
        alt="Jarvis Grid"
        className="grid"
      />

      <style jsx>{`
        .hero {
          position: relative;
          height: 100vh;
          overflow: hidden;
          background: radial-gradient(
            circle at center,
            #141414 0%,
            #0a0a0a 45%,
            #000 100%
          );
          perspective: 1200px;
        }

        .glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at center,
            rgba(255,255,255,0.08),
            transparent 60%
          );
          pointer-events: none;
        }

        .grid {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1200px;
          opacity: 0.55;

          transform-style: preserve-3d;
          will-change: transform;
          transition: transform 0.12s ease-out;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
