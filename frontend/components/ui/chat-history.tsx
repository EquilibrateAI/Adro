"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  X,
  Check,
  Search,
} from "lucide-react";
import { useChatStore } from "@/services/utils/dashboard/text-mode/chat-cli-store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
interface ChatHistoryProps {
  onSessionSelect?: () => void;
}

// This component manages and displays the list of past chat sessions
export const ChatHistory = ({ onSessionSelect }: ChatHistoryProps) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    sessions,
    currentSessionId,
    isLoading,
    createNewSession,
    switchSession,
    deleteSession,
    updateSessionTitle,
    fetchTitlesFromBackend,
  } = useChatStore();

  // Fetch titles from backend on mount (handles refresh/navigation)
  useEffect(() => {
    fetchTitlesFromBackend();
  }, [fetchTitlesFromBackend]);

  const handleSelectChat = (chatId: string) => {
    if (chatId) {
      switchSession(chatId);
      onSessionSelect?.();
    }
  };

  const handleNewChat = () => {
    try {
      createNewSession();
      toast.success("New chat started", { duration: 2000 });
      onSessionSelect?.();
    } catch {
      toast.error("Failed to start new chat");
    }
  };

  const handleDeleteClick = (
    e: React.MouseEvent,
    chatId: string,
    chatTitle: string
  ) => {
    e.stopPropagation();
    setChatToDelete({ id: chatId, title: chatTitle });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return;

    setIsDeleting(true);
    try {
      deleteSession(chatToDelete.id);
      setShowDeleteModal(false);
      setChatToDelete(null);
      toast.success("Chat deleted successfully", { duration: 2000 });
    } catch (error) {
      setShowDeleteModal(false);
      setChatToDelete(null);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete chat",
        { duration: 3000 }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setChatToDelete(null);
  };

  const handleRenameClick = (
    e: React.MouseEvent,
    chatId: string,
    currentTitle: string
  ) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(currentTitle || "");
  };

  const handleRenameSave = async (chatId: string) => {
    if (!editingTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    const session = sessions.find((s) => s.id === chatId);
    if (editingTitle.trim() === session?.title) {
      setEditingChatId(null);
      setEditingTitle("");
      return;
    }

    const titleToSave = editingTitle.trim();
    
    // We update local state first for immediate UI response
    // updateSessionTitle also calls the backend
    try {
      updateSessionTitle(chatId, titleToSave);
      toast.success("Chat renamed successfully", { duration: 2000 });
      setEditingChatId(null);
      setEditingTitle("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update title",
        { duration: 3000 }
      );
    }
  };

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditingTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, chatId: string) => {
    if (e.key === "Enter") {
      handleRenameSave(chatId);
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const filteredTitles = sessions
    .filter((chat) => 
      // Show chats that either have a title set or have at least one message
      ((chat?.title && chat.title.trim() !== "") || (chat?.messages && chat.messages.length > 0)) &&
      (chat?.title || chat?.messages?.[0]?.content || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        <div className="p-3">
          <button
            id="new-chat-button"
            onClick={handleNewChat}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm justify-center disabled:opacity-50"
            title="New Chat"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">New Chat</span>
          </button>
        </div>

        <div className="px-3 py-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t" />
         <ScrollArea className="flex-1 h-full">
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredTitles.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {searchQuery ? "No matching chats" : "No chats yet"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? "Try a different search"
                  : "Start a new conversation"}
              </p>
            </div>
          ) : (
            filteredTitles.map((chat) => (
              <div
                key={chat?.id}
                className={`group relative rounded-lg transition-all ${
                  chat?.id === currentSessionId
                    ? "bg-indigo-50 border border-indigo-200"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                {editingChatId === chat?.id ? (
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, chat?.id)}
                      className="flex-1 text-sm px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameSave(chat?.id);
                      }}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenameCancel();
                      }}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelectChat(chat?.id)}
                      className="w-full text-left px-3 py-2.5 text-sm"
                      title={chat?.title || chat?.messages?.[0]?.content}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare
                          className={`w-4 h-4 flex-shrink-0 ${
                            chat?.id === currentSessionId
                              ? "text-indigo-600"
                              : "text-slate-500"
                          }`}
                        />
                        <span
                          className={`truncate w-40 ${
                            chat?.id === currentSessionId
                              ? "font-medium text-indigo-700"
                              : "text-slate-700"
                          }`}
                        >
                          {chat?.title || chat?.messages?.[0]?.content || ""}
                        </span>
                      </div>
                    </button>

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) =>
                          handleRenameClick(
                            e,
                            chat?.id,
                            chat?.title || "Untitled Chat"
                          )
                        }
                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                        title="Rename chat"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) =>
                          handleDeleteClick(
                            e,
                            chat?.id,
                            chat?.title || ""
                          )
                        }
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        </ScrollArea>

        <div className="p-4 border-t text-xs text-slate-400">
          {filteredTitles.length}{" "}
          {filteredTitles.length === 1 ? "chat" : "chats"}
        </div>
      </div>

      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                Delete Chat
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-600">
              Are you sure you want to delete this chat?
            </DialogDescription>
          </DialogHeader>

          {chatToDelete && (
            <div className="text-sm text-slate-500 my-4 p-3 bg-slate-50 rounded-lg">
              &ldquo;{chatToDelete.title}&rdquo;
            </div>
          )}

          <DialogFooter className="flex justify-end gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};


