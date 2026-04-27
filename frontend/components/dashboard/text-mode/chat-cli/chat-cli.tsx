"use client";

import { useRef, useEffect } from "react";
// import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { motion } from "framer-motion";
import { MessageSquare, Clock } from "lucide-react";

import MarkDown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { useChatStore } from "@/services/utils/dashboard/text-mode/chat-cli-store";

interface TableRow {
  [key: string]: string;
}

// A chat interface component designed for command-line style data analysis interactions
export default function ChatCli() {
  const chatMessages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);

  // Only render messages for text mode
  const textMessages = chatMessages.filter((m) => m.mode === "text");

  const scrollAreaRef = useRef<HTMLDivElement>(null);

// Ensures the chat window automatically scrolls to the latest message whenever content updates
  const scrollPageToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollPageToBottom();
  }, [textMessages, isLoading]);

  return (
    <div className="h-[calc(100vh-10rem)] w-full flex flex-col shadow-lg bg-gradient-to-br from-slate-50 via-white to-slate-50 rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-white/50 backdrop-blur-sm p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-lg flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 truncate">Chat</h2>
            <p className="text-xs text-slate-600 truncate">Data analysis conversation</p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 flex-shrink-0">
            {textMessages.length}
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 overflow-hidden"
      >
        <div
          className="h-full overflow-y-auto overflow-x-hidden px-4 py-3"
          ref={scrollAreaRef}
        >
          <div className="space-y-4">
            {textMessages.map((message, idx) => (
              <div key={idx} className="space-y-2">
                {message.type === "user" ? (
                  <div className="flex justify-end">
                    <div className="inline-block max-w-[80%] rounded-2xl px-5 py-3 bg-gray-900 text-white shadow-sm">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-block max-w-[85%] rounded-2xl px-5 py-3 bg-gray-100 text-gray-900 shadow-sm">
                      <MarkDown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            ol: ({ children, ...props }) => (
                              <ol className="list-decimal list-outside space-y-1 my-2 ml-6" {...props}>
                                {children}
                              </ol>
                            ),
                            ul: ({ children, ...props }) => (
                              <ul className="list-disc list-outside space-y-1 my-2 ml-6" {...props}>
                                {children}
                              </ul>
                            ),
                            li: ({ children, ...props }) => (
                              <li className="leading-relaxed pl-2" {...props}>
                                {children}
                              </li>
                            ),
                            blockquote: ({ children, ...props }) => (
                              <blockquote className="border-l-4 border-primary/20 bg-primary/5 pl-4 py-2 my-2 italic text-sm" {...props}>
                                {children}
                              </blockquote>
                            ),
                            code: ({ children, ...props }) => (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                {children}
                              </code>
                            ),
                            pre: ({ children, ...props }) => (
                              <pre className="bg-muted/50 p-4 rounded-lg overflow-x-auto text-xs mt-2 mb-2" {...props}>
                                {children}
                              </pre>
                            ),
                            table: ({ children, ...props }) => (
                              <div className="overflow-x-auto">
                                <table className="border-collapse border border-muted/30 text-xs my-4 w-full" {...props}>
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children, ...props }) => (
                              <th className="border border-muted/30 px-3 py-2 bg-muted/50 font-medium text-left" {...props}>
                                {children}
                              </th>
                            ),
                            td: ({ children, ...props }) => (
                              <td className="border border-muted/30 px-3 py-2" {...props}>
                                {children}
                              </td>
                            ),
                        }}
                      >
                        {message.content}
                      </MarkDown>

                      {message.data?.tableData && (
                        <div className="mt-3 bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                          <Table className="w-full text-xs">
                            <TableHeader>
                              <TableRow className="bg-white border-b">
                                {message.data.tableData.columns.map((col) => (
                                  <TableHead
                                    key={col.key}
                                    className="px-3 py-2 text-xs font-semibold text-gray-700 border-r last:border-r-0 whitespace-nowrap"
                                  >
                                    {col.label}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {message.data.tableData?.rows.map((row, ridx) => (
                                <TableRow
                                  key={ridx}
                                  className="border-b last:border-b-0"
                                >
                                  {message.data?.tableData?.columns.map((col) => (
                                    <TableCell
                                      key={col.key}
                                      className="px-3 py-2 border-r last:border-r-0 text-xs whitespace-nowrap"
                                    >
                                      {row[col.key] ?? ""}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {message.data?.metrics && (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          {message.data.metrics.map((metric, midx) => (
                            <div
                              key={midx}
                              className="p-3 rounded-lg border-2 bg-white"
                              style={{
                                borderColor: metric.backgroundColor || "#e5e7eb",
                              }}
                            >
                              <div className="text-xs font-medium text-gray-600 mb-1">
                                {metric.label}
                              </div>
                              <div className="text-sm font-bold text-gray-900">
                                {metric.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 px-2">
                      <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-500">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                )}

                {message.type === "user" && (
                  <div className="flex items-center justify-end gap-1 px-2">
                    <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs text-slate-500">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="space-y-2">
                <div className="inline-block rounded-2xl px-5 py-3 bg-gray-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}