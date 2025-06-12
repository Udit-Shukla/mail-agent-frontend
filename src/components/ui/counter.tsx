"use client"

import * as React from "react"
import { useSpring, animated } from "@react-spring/web"

interface CounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number
}

export function Counter({ value, className, ...props }: CounterProps) {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 200,
    config: { mass: 1, tension: 20, friction: 10 },
  })

  return (
    <animated.span className={className} {...props}>
      {number.to((n) => Math.round(n))}
    </animated.span>
  )
} 