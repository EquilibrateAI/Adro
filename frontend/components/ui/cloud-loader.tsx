"use client";

import React from "react";

interface CloudLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const CloudLoader: React.FC<CloudLoaderProps> = ({
  className,
  size = "md",
}) => {
  const dim = size === "sm" ? 24 : size === "lg" ? 48 : 36;

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className ?? ""}`}
      aria-label="Loading"
    >
      {/* Animated cloud SVG */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: dim, height: dim }}
      >
        {/* Soft glow halo */}
        <span
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.35) 0%, transparent 70%)",
          }}
        />

        {/* Cloud SVG — animated fill gradient */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient
              id="cloudGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#60a5fa">
                <animate
                  attributeName="stop-color"
                  values="#60a5fa;#818cf8;#60a5fa"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="#3b82f6">
                <animate
                  attributeName="stop-color"
                  values="#3b82f6;#6366f1;#3b82f6"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
          </defs>

          {/* Cloud path — rounded overlapping circles */}
          <path
            d="M48 38H20a10 10 0 0 1-1.6-19.87A14 14 0 0 1 46 24h2a8 8 0 0 1 0 14z"
            fill="url(#cloudGrad)"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -2; 0 0"
              dur="2.8s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
            />
          </path>

          {/* Small cloud accent */}
          <path
            d="M16 44H9a5 5 0 0 1-.8-9.93A7 7 0 0 1 23 38h-7z"
            fill="url(#cloudGrad)"
            opacity="0.55"
          >
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -1.5; 0 0"
              dur="2.8s"
              begin="0.3s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
            />
          </path>
        </svg>
      </div>

    </div>
  );
};
