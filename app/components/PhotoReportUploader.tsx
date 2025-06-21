"use client";
import { useState, useRef, useEffect } from "react";
import { getLocation } from "../lib/getLocation";

interface BackendAck {
  acknowledgement: string;
}

export default function PhotoReportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // build / clean preview url
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setMessage(null);
    }
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { lat, lon } = await getLocation();
      const fd = new FormData();
      fd.append("file", file);               // field names must match backend spec
      fd.append("latitude", lat.toString());
      fd.append("longitude", lon.toString());

      const res = await fetch("/api/generate-report", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json: BackendAck = await res.json();
      setMessage(json.acknowledgement || "Success!");
      setFile(null);
      setPreview(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-lg">
      <h1 className="text-2xl font-bold text-neutral-900">Snap‑to‑Report</h1>

      {preview ? (
        <img src={preview} alt="preview" className="h-56 w-full rounded-lg object-cover" />
      ) : (
        <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-gray-500">
          <span className="mb-2 text-sm">Tap to capture / choose photo</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFile}
          />
        </label>
      )}

      {!preview && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg bg-blue-600 py-2 text-white"
        >
          Select Photo
        </button>
      )}

      {preview && (
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-lg bg-green-600 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit Report"}
        </button>
      )}

      {message && (
        <p className="rounded-lg bg-green-100 p-3 text-center text-sm font-medium text-green-800">{message}</p>
      )}
    </div>
  );
}