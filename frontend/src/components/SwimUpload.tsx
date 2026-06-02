"use client";

import { useRef, useState } from "react";

interface Props {
  onSubmit: (file: File, stroke: string) => void;
  loading: boolean;
}

const STROKES = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly"];

export default function SwimUpload({ onSubmit, loading }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [stroke, setStroke] = useState("Freestyle");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (!f.type.startsWith("video/")) return;
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    onSubmit(file, stroke.toLowerCase());
  }

  const sizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Stroke</label>
        <select
          value={stroke}
          onChange={(e) => setStroke(e.target.value)}
          className="w-full sm:w-56 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {STROKES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-m4v"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {file ? (
          <div>
            <div className="text-3xl mb-2">🎥</div>
            <p className="text-sm font-semibold text-gray-900">{file.name}</p>
            <p className="text-xs text-gray-500 mt-1">{sizeMB} MB · click to change</p>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-3 text-gray-400">📁</div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-blue-700">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI · max 100 MB</p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!file || loading}
        className="rounded-md bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Analyzing… this may take a minute" : "Analyze Stroke"}
      </button>
    </form>
  );
}
