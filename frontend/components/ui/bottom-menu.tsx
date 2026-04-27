"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import Link from "next/link"

export interface MenuBarItem {
  icon: React.ElementType
  label: string
  href: string
}

interface MenuBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: MenuBarItem[]
  activeIndex?: number | null
}

const springConfig = {
  duration: 0.3,
  ease: "easeInOut" as const
}

// A floating bottom menu bar with animated tooltips for navigation
export function MenuBar({ items, className, activeIndex, ...props }: MenuBarProps) {
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [tooltipPosition, setTooltipPosition] = React.useState({ left: 0, width: 0 })
  const tooltipRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (hoverIndex !== null && menuRef.current && tooltipRef.current) {
      const menuItem = menuRef.current.children[hoverIndex] as HTMLElement
      const menuRect = menuRef.current.getBoundingClientRect()
      const itemRect = menuItem.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()

      const left = itemRect.left - menuRect.left + (itemRect.width - tooltipRect.width) / 2

      setTooltipPosition({
        left: Math.max(0, Math.min(left, menuRect.width - tooltipRect.width)),
        width: tooltipRect.width
      })
    }
  }, [hoverIndex])

  return (
    <div className={cn("relative", className)} {...props}>
      <AnimatePresence>
        {hoverIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={springConfig}
            className="absolute left-0 right-0 -bottom-[15px] z-50 flex"

          >
            <motion.div
              ref={tooltipRef}
              className={cn(
                "h-7 px-3 rounded-lg inline-flex justify-center items-center overflow-hidden",
                "bg-background/95 backdrop-blur",
                "border border-border/50",
                "shadow-[0_0_0_1px_rgba(0,0,0,0.08)]",
                "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              )}
              initial={{ x: tooltipPosition.left }}
              animate={{ x: tooltipPosition.left }}
              transition={springConfig}
              style={{ width: "auto" }}
            >
              <p className="text-[13px] font-medium leading-tight whitespace-nowrap">
                {items[hoverIndex].label}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={menuRef}
        className={cn(
          "h-10 px-1.5 inline-flex justify-center items-center gap-[3px] overflow-hidden z-10",
          "rounded-full bg-background/95 backdrop-blur",
          "border border-border/50",
          "shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_-4px_rgba(0,0,0,0.1)]",
          "dark:border-border/50 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_16px_-4px_rgba(0,0,0,0.2)]"
        )}
      >
        {items.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className={cn(
              "w-8 h-8 px-3 py-1 rounded-full flex justify-center items-center gap-2",
              "hover:bg-muted/80 transition-colors",
              activeIndex === index ? "text-primary" : "text-muted-foreground"
            )}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div className="flex justify-center items-center">
              <div className="w-[18px] h-[18px] flex justify-center items-center overflow-hidden">
                <item.icon className="w-full h-full" />
              </div>
            </div>
            <span className="sr-only">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}