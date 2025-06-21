"use client";
import { useState, useRef, useEffect } from "react";
import { getLocation } from "../lib/getLocation";

interface DraftResponse {
  label: string;
  complaint_type: string;
  address: string;
  duplications_today: number;
  confidence: number;
}

export default function PhotoReportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // create / revoke preview URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const generateDraft = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const { lat, lon } = await getLocation();
      const fd = new FormData();
      fd.append("image", file);
      fd.append("lat", lat.toString());
      fd.append("lon", lon.toString());

      const res = await fetch("/api/draft", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Draft failed");
      const json: DraftResponse = await res.json();
      setDraft(json);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async () => {
    if (!draft || !file) return;
    try {
      const { lat, lon } = await getLocation();
      const fd = new FormData();
      fd.append("image", file);
      fd.append("lat", lat.toString());
      fd.append("lon", lon.toString());
      fd.append("draft", JSON.stringify(draft));

      const res = await fetch("/api/submit", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Submit failed");
      const { service_request_id } = await res.json();
      alert(`Success! 311 SR #: ${service_request_id}`);
      // reset UI
      setFile(null);
      setDraft(null);
      setPreviewUrl(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-lg">
      <h1 className="text-xl font-semibold">Snap‑to‑Report</h1>

      {previewUrl ? (
        <img src={previewUrl} alt="preview" className="h-56 w-full rounded-lg object-cover" />
      ) : (
        <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-gray-500">
          <span className="mb-2 text-sm">Tap to capture / choose photo</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFileChange}
          />
        </label>
      )}

      {!previewUrl && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg bg-blue-600 py-2 text-white"
        >
          Select Photo
        </button>
      )}

      {previewUrl && !draft && (
        <button
          onClick={generateDraft}
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Generate Draft"}
        </button>
      )}

      {draft && (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="font-medium">{draft.complaint_type}</p>
            <p>{draft.address}</p>
            {draft.duplications_today > 0 && (
              <p className="text-xs text-orange-600">
                Heads‑up: another report in this spot today.
              </p>
            )}
          </div>
          <button
            onClick={submitReport}
            className="w-full rounded-lg bg-green-600 py-2 text-white"
          >
            Submit to 311
          </button>
        </div>
      )}
    </div>
  );
}