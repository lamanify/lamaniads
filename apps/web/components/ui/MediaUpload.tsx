'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, Image as ImageIcon, Video } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface UploadedMedia {
  kind: 'image' | 'video';
  hash?: string;
  video_id?: string;
  url?: string;
  preview?: string;
  filename?: string;
}

interface MediaUploadProps {
  label?: string;
  hint?: string;
  value: UploadedMedia[];
  onUpload: (file: File, kind: 'image' | 'video') => Promise<UploadedMedia>;
  onRemove: (index: number) => void;
  multiple?: boolean;
  accept?: string;
}

export function MediaUpload({
  label,
  hint,
  value,
  onUpload,
  onRemove,
  multiple = false,
  accept = 'image/*,video/*',
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList) => {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        const uploaded = await onUpload(file, kind);
        uploaded.preview = preview;
        uploaded.filename = file.name;
      }
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      {label ? <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label> : null}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
        className={cn(
          'cursor-pointer rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-900',
          dragOver && 'border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          }}
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading to Meta...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Click to upload or drag and drop</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">PNG, JPG, MP4. Stored on Meta directly.</p>
          </div>
        )}
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {hint && !error ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
      {value.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {value.map((m, idx) => (
            <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
              {m.preview ? (
                <img src={m.preview} alt={m.filename} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                  {m.kind === 'video' ? <Video className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                </div>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(idx);
                }}
                className="absolute right-1 top-1 rounded-full bg-zinc-900/80 p-0.5 text-white hover:bg-zinc-900"
              >
                <X className="h-3 w-3" />
              </button>
              {m.filename ? (
                <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/80 px-2 py-1 text-[10px] text-white truncate">
                  {m.filename}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
