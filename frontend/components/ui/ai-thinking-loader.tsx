"use client";

import React from "react";
import { motion } from "framer-motion";

interface AIThinkingLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const AIThinkingLoader: React.FC<AIThinkingLoaderProps> = ({
  className,
  size = "md",
}) => {
  const dotSize = size === "sm" ? 4 : size === "lg" ? 8 : 6;
  const gap = size === "sm" ? 2 : size === "lg" ? 8 : 6;
  const bounceHeight = size === "sm" ? -4 : size === "lg" ? -8 : -6;

  return (
    <div
      className={`flex items-center justify-center py-1 ${className ?? ""}`}
      style={{ gap }}
      aria-label="AI is thinking"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          style={{
            width: dotSize,
            height: dotSize,
          }}
          animate={{
            y: [0, bounceHeight, 0],
            opacity: [0.4, 1, 0.4],
            scale: [0.8, 1.1, 0.8],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
