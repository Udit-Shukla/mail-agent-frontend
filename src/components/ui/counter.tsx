"use client"

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

interface CounterProps {
  value: number
  duration?: number
  className?: string
}

export function Counter({ value, duration = 1000, className }: CounterProps) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  useEffect(() => {
    if (inView) {
      if (value === 0) {
        setCount(0)
        return
      }

      let start = 0
      const end = value
      const incrementTime = duration / end
      
      const timer = setInterval(() => {
        start += 1
        setCount(start)
        if (start >= end) {
          clearInterval(timer)
        }
      }, incrementTime)

      return () => clearInterval(timer)
    }
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {count}
    </span>
  )
} 