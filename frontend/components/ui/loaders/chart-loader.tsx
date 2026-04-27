"use client";
import React from "react";
// A spinning loader designed for chart loading states
export const ChartLoader = ({ className = "" }: { className?: string }) => (
  <div className={`adro-chart-loader ${className}`}></div>
);
export default ChartLoader;
<style jsx>{`
.adro-chart-loader{width:50px;aspect-ratio:1;display:grid;border-radius:50%;background:conic-gradient(#25b09b 25%,#f03355 0 50%,#514b82 0 75%,#ffa516 0);animation:l22 2s infinite linear}
.adro-chart-loader:before,.adro-chart-loader:after{content:"";grid-area:1/1;margin:15%;border-radius:50%;background:inherit;animation:inherit}
.adro-chart-loader:after{margin:25%;animation-duration:3s}
@keyframes l22{100%{transform:rotate(1turn)}}
`}</style>