'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle } from 'lucide-react';

interface Comment {
  id: string;
  author_name: string;
  author_type: string;
  message: string;
  created_at: string;
}

interface CommentThreadProps {
  draftId: string;
  fieldType: 'headline' | 'description';
  fieldIndex: number;
  fieldContent: string;
  authorName: string;
  comments: Comment[];
  onClose: () => void;
  onSubmitComment: (message: string) => Promise<void>;
}

export default function CommentThread({
  fieldType,
  fieldIndex,
  fieldContent,
  authorName,
  comments,
  onClose,
  onSubmitComment,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll the local container instead of bubbling up and scrolling the main browser window viewport
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      await onSubmitComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-[calc(100vw-4rem)] xs:w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 capitalize">
            {fieldType} {fieldIndex + 1} Comments
          </h4>
          <p className="text-[10px] text-zinc-500 truncate max-w-[200px] mt-0.5 font-medium">
            "{fieldContent}"
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto p-4 space-y-3">
        {comments.map((comment) => {
          const isAgency = comment.author_type === 'agency';
          return (
            <div key={comment.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${isAgency ? 'text-brand' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {comment.author_name}
                  {isAgency && (
                    <span className="text-[9px] bg-brand/10 text-brand px-1 py-0.2 rounded font-normal uppercase tracking-wider">
                      Agency
                    </span>
                  )}
                </span>
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-2 rounded-md border border-zinc-100 dark:border-zinc-900 leading-normal break-words">
                {comment.message}
              </p>
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-6 text-zinc-400 dark:text-zinc-600 flex flex-col items-center justify-center gap-1.5">
            <MessageCircle className="h-6 w-6 stroke-[1.5]" />
            <span className="text-xs">No comments yet. Be the first!</span>
          </div>
        )}
        <div ref={threadEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-1.5">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-1 focus:ring-brand/40 dark:focus:ring-brand/30 placeholder-zinc-400 dark:placeholder-zinc-600"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="bg-brand text-white p-1.5 rounded hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
        {authorName && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 pl-0.5">
            Commenting as: <span className="font-semibold text-zinc-600 dark:text-zinc-400">{authorName}</span>
          </p>
        )}
      </form>
    </div>
  );
}
