"use client"

import { cn } from "@/lib/utils"
import React, { useCallback, useEffect, useRef, useState } from "react"
import MarkDown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"

export type Mode = "typewriter" | "fade"

export type UseTextStreamOptions = {
  textStream: string | AsyncIterable<string>
  speed?: number
  mode?: Mode
  onComplete?: () => void
  fadeDuration?: number
  segmentDelay?: number
  characterChunkSize?: number
  onError?: (error: unknown) => void
}

export type UseTextStreamResult = {
  displayedText: string
  isComplete: boolean
  segments: { text: string; index: number }[]
  getFadeDuration: () => number
  getSegmentDelay: () => number
  reset: () => void
  startStreaming: () => void
  pause: () => void
  resume: () => void
}

// ✅ SHARED MARKDOWN COMPONENTS
const markdownComponents = {
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal list-outside space-y-1 my-2 ml-6" {...props}>
      {children}
    </ol>
  ),
  ul: ({ children, ...props }: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc list-outside space-y-1 my-2 ml-6" {...props}>
      {children}
    </ul>
  ),
  li: ({ children, ...props }: React.ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed pl-2" {...props}>
      {children}
    </li>
  ),
  blockquote: ({ children, ...props }: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-4 border-primary/20 bg-primary/5 pl-4 py-2 my-2 italic text-sm" {...props}>
      {children}
    </blockquote>
  ),
  code: ({ children, ...props }: React.ComponentPropsWithoutRef<"code">) => (
    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }: React.ComponentPropsWithoutRef<"pre">) => (
    <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs mt-2 mb-2" {...props}>
      {children}
    </pre>
  ),
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="overflow-x-auto">
      <table className="border-collapse border border-muted/30 text-xs my-4 w-full" {...props}>
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<"th">) => (
    <th className="border border-muted/30 px-3 py-2 bg-muted/50 font-medium text-left" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<"td">) => (
    <td className="border border-muted/30 px-3 py-2" {...props}>
      {children}
    </td>
  ),
}

// A custom hook that handles text streaming with typewriter or fade effects
function useTextStream({
  textStream,
  speed = 20,
  mode = "typewriter",
  onComplete,
  fadeDuration,
  segmentDelay,
  characterChunkSize,
  onError,
}: UseTextStreamOptions): UseTextStreamResult {
  const [displayedText, setDisplayedText] = useState("")
  const [isComplete, setIsComplete] = useState(false)
  const [segments, setSegments] = useState<{ text: string; index: number }[]>([])

  const speedRef = useRef(speed)
  const modeRef = useRef(mode)
  const currentIndexRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const fadeDurationRef = useRef(fadeDuration)
  const segmentDelayRef = useRef(segmentDelay)
  const characterChunkSizeRef = useRef(characterChunkSize)
  const streamRef = useRef<AbortController | null>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    speedRef.current = speed
    modeRef.current = mode
    fadeDurationRef.current = fadeDuration
    segmentDelayRef.current = segmentDelay
    characterChunkSizeRef.current = characterChunkSize
  }, [speed, mode, fadeDuration, segmentDelay, characterChunkSize])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Dynamically calculates the number of characters to process per frame based on speed
  const getChunkSize = useCallback(() => {
    if (typeof characterChunkSizeRef.current === "number") {
      return Math.max(1, characterChunkSizeRef.current)
    }

    const normalizedSpeed = Math.min(100, Math.max(1, speedRef.current))

    if (modeRef.current === "typewriter") {
      if (normalizedSpeed < 25) return 1
      return Math.max(1, Math.round((normalizedSpeed - 25) / 10))
    } else if (modeRef.current === "fade") {
      return 1
    }

    return 1
  }, [])

  const getProcessingDelay = useCallback(() => {
    if (typeof segmentDelayRef.current === "number") {
      return Math.max(0, segmentDelayRef.current)
    }

    const normalizedSpeed = Math.min(100, Math.max(1, speedRef.current))
    return Math.max(1, Math.round(100 / Math.sqrt(normalizedSpeed)))
  }, [])

  const getFadeDuration = useCallback(() => {
    if (typeof fadeDurationRef.current === "number")
      return Math.max(10, fadeDurationRef.current)

    const normalizedSpeed = Math.min(100, Math.max(1, speedRef.current))
    return Math.round(1000 / Math.sqrt(normalizedSpeed))
  }, [])

  const getSegmentDelay = useCallback(() => {
    if (typeof segmentDelayRef.current === "number")
      return Math.max(0, segmentDelayRef.current)

    const normalizedSpeed = Math.min(100, Math.max(1, speedRef.current))
    return Math.max(1, Math.round(100 / Math.sqrt(normalizedSpeed)))
  }, [])

  // ✅ FIXED: Sentence-aware segmentation
  const updateSegments = useCallback((text: string) => {
    if (modeRef.current === "fade") {
      const sentences = text.match(/[^.!?]+[.!?]+|$/g) || [text]
      const newSegments = sentences
        .map((sentence, index) => ({
          text: sentence.trim() || ' ',
          index,
        }))
        .filter(s => s.text.length > 0)
      setSegments(newSegments)
    }
  }, [])

  const markComplete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true
      setIsComplete(true)
      onCompleteRef.current?.()
    }
  }, [])

  // Resets the stream state back to its initial empty configuration
  const reset = useCallback(() => {
    currentIndexRef.current = 0
    setDisplayedText("")
    setSegments([])
    setIsComplete(false)
    completedRef.current = false

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const processStringTypewriter = useCallback(
    (text: string) => {
      let lastFrameTime = 0

      const streamContent = (timestamp: number) => {
        const delay = getProcessingDelay()
        if (delay > 0 && timestamp - lastFrameTime < delay) {
          animationRef.current = requestAnimationFrame(streamContent)
          return
        }
        lastFrameTime = timestamp

        if (currentIndexRef.current >= text.length) {
          markComplete()
          return
        }

        const chunkSize = getChunkSize()
        const endIndex = Math.min(
          currentIndexRef.current + chunkSize,
          text.length
        )
        const newDisplayedText = text.slice(0, endIndex)

        setDisplayedText(newDisplayedText)
        if (modeRef.current === "fade") {
          updateSegments(newDisplayedText)
        }

        currentIndexRef.current = endIndex

        if (endIndex < text.length) {
          animationRef.current = requestAnimationFrame(streamContent)
        } else {
          markComplete()
        }
      }

      animationRef.current = requestAnimationFrame(streamContent)
    },
    [getProcessingDelay, getChunkSize, updateSegments, markComplete]
  )

  const processAsyncIterable = useCallback(
    async (stream: AsyncIterable<string>) => {
      const controller = new AbortController()
      streamRef.current = controller

      let displayed = ""

      try {
        for await (const chunk of stream) {
          if (controller.signal.aborted) return

          displayed += chunk
          setDisplayedText(displayed)
          updateSegments(displayed)
        }

        markComplete()
      } catch (error) {
        console.error("Error processing text stream:", error)
        markComplete()
        onError?.(error)
      }
    },
    [updateSegments, markComplete, onError]
  )

  // Initiates the streaming process for either static strings or async iterables
  const startStreaming = useCallback(() => {
    reset()

    if (typeof textStream === "string") {
      processStringTypewriter(textStream)
    } else if (textStream) {
      processAsyncIterable(textStream)
    }
  }, [textStream, reset, processStringTypewriter, processAsyncIterable])

  const pause = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof textStream === "string" && !isComplete) {
      processStringTypewriter(textStream)
    }
  }, [textStream, isComplete, processStringTypewriter])

  useEffect(() => {
    startStreaming()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (streamRef.current) {
        streamRef.current.abort()
      }
    }
  }, [textStream, startStreaming])

  return {
    displayedText,
    isComplete,
    segments,
    getFadeDuration,
    getSegmentDelay,
    reset,
    startStreaming,
    pause,
    resume,
  }
}

export type ResponseStreamProps = {
  textStream: string | AsyncIterable<string>
  mode?: Mode
  speed?: number
  className?: string
  onComplete?: () => void
  as?: keyof React.JSX.IntrinsicElements
  fadeDuration?: number
  segmentDelay?: number
  characterChunkSize?: number
}

// A component that renders streaming text with markdown support and animations
function ResponseStream({
  textStream,
  mode = "typewriter",
  speed = 20,
  className = "",
  onComplete,
  as = "div",
  fadeDuration,
  segmentDelay,
  characterChunkSize,
}: ResponseStreamProps) {
  const animationEndRef = useRef<(() => void) | null>(null)

  const {
    displayedText,
    isComplete,
    segments,
    getFadeDuration,
    getSegmentDelay,
  } = useTextStream({
    textStream,
    speed,
    mode,
    onComplete,
    fadeDuration,
    segmentDelay,
    characterChunkSize,
  })

  useEffect(() => {
    animationEndRef.current = onComplete ?? null
  }, [onComplete])

  const handleLastSegmentAnimationEnd = useCallback(() => {
    if (animationEndRef.current && isComplete) {
      animationEndRef.current()
    }
  }, [isComplete])

  const fadeStyle = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .fade-segment {
      display: inline;
      opacity: 0;
      animation: fadeIn ${getFadeDuration()}ms ease-out forwards;
    }
  `

  const renderContent = () => {
    // ✅ TYPEWRITER MODE: Full Markdown streaming
    if (mode === "typewriter") {
      return (
        <MarkDown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
        >
          {displayedText}
        </MarkDown>
      )
    }

    // ✅ FADE MODE: Sentence-by-sentence Markdown
    if (mode === "fade") {
      return (
        <>
          <style>{fadeStyle}</style>
          <div className="relative prose prose-sm max-w-none leading-relaxed">
            {segments.map((segment, idx) => {
              const isLastSegment = idx === segments.length - 1
              return (
                <span
                  key={`${segment.text}-${idx}`}
                  className="fade-segment"
                  style={{
                    animationDelay: `${idx * getSegmentDelay()}ms`,
                  }}
                  onAnimationEnd={isLastSegment ? handleLastSegmentAnimationEnd : undefined}
                >
                  <MarkDown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents}
                  >
                    {segment.text}
                  </MarkDown>
                </span>
              )
            })}
          </div>
        </>
      )
    }

    // ✅ DEFAULT: Full Markdown
    return (
      <MarkDown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {displayedText}
      </MarkDown>
    )
  }

  const Container = as as keyof React.JSX.IntrinsicElements

  return <Container className={cn(className)}>{renderContent()}</Container>
}

export { useTextStream, ResponseStream }
