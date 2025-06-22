"use client";
import { useState, useRef, useEffect } from "react";
import { getLocation } from "../lib/getLocation";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "../lib/supabaseClient";
import { BUCKET_NAME } from "../config";

interface BackendAck {
  report: string;
}

interface ParsedReport {
  title: string;
  category: string;
  location: string;
  description: string;
  impact: string;
}

// Function to parse the backend report string
function parseReportString(reportStr: string): ParsedReport | null {
  try {
    // Remove any extra whitespace and parse as JSON
    const cleanStr = reportStr.trim();
    const parsed = JSON.parse(cleanStr);
    
    return {
      title: parsed.title || "",
      category: parsed.category || "",
      location: parsed.location || "",
      description: parsed.description || "",
      impact: parsed.impact || ""
    };
  } catch (error) {
    // Fallback regex parsing if JSON parsing fails
    const patterns = {
      title: /"title":\s*"([^"]*?)"/,
      category: /"category":\s*"([^"]*?)"/,
      location: /"location":\s*"([^"]*?)"/,
      description: /"description":\s*"([^"]*?)"/,
      impact: /"impact":\s*"([^"]*?)"/
    };

    const result: ParsedReport = {
      title: "",
      category: "",
      location: "",
      description: "",
      impact: ""
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = reportStr.match(pattern);
      if (match && match[1]) {
        result[key as keyof ParsedReport] = match[1];
      }
    }

    // Return null if no meaningful data was extracted
    if (!result.title && !result.category && !result.description) {
      return null;
    }

    return result;
  }
}

export default function PhotoReportUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [parsedReport, setParsedReport] = useState<ParsedReport | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build / clean preview url
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
      setParsedReport(null);
    }
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const mainId = Math.floor(100000 + Math.random() * 900000).toString();
      const { lat, lon } = await getLocation();
      const filePath = `${file.name}`;
      
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);
      
      if (error) throw new Error("File upload failed: " + error.message);
      
      const { data: publicUrlData } = supabase
        .storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
      
      const imageUrl = publicUrlData.publicUrl;
      console.log(imageUrl);
      
      const fd = new FormData();
      fd.append("file", imageUrl);
      fd.append("latitude", lat.toString());
      fd.append("longitude", lon.toString());
      
      const res = await fetch("/api/generate-report", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      
      const json: BackendAck = await res.json();
      
      // Parse the report string
      const parsed = parseReportString(json.report);
      if (parsed) {
        setParsedReport(parsed);
        setMessage("Report generated successfully!");
      } else {
        setMessage(json.report || "Success!");
      }
      
      setFile(null);
      setPreview(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const resetReport = () => {
    setParsedReport(null);
    setMessage(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-lg">
      <h1 className="text-2xl font-bold text-center text-neutral-900">Upload Photo</h1>
      
      {/* Report Display Section */}
      {parsedReport && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Generated Report</h2>
            <button
              onClick={resetReport}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Create New Report
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Title</h3>
              <p className="text-gray-900 font-medium">{parsedReport.title}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Category</h3>
              <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                {parsedReport.category}
              </span>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Location</h3>
              <p className="text-gray-600 text-sm">{parsedReport.location}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
              <p className="text-gray-800 text-sm leading-relaxed">{parsedReport.description}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Impact Assessment</h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                <p className="text-yellow-800 text-sm leading-relaxed">{parsedReport.impact}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Upload Section - Hide when report is displayed */}
      {!parsedReport && (
        <>
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
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          )}
        </>
      )}
      
      {/* Message Display */}
      {message && !parsedReport && (
        <p className="rounded-lg bg-green-100 p-3 text-center text-sm font-medium text-green-800">
          {message}
        </p>
      )}
    </div>
  );
}


// "use client";
// import { useState, useRef, useEffect } from "react";
// import { getLocation } from "../lib/getLocation";
// import { v4 as uuidv4 } from 'uuid';
// import { supabase } from "../lib/supabaseClient";
// import { BUCKET_NAME } from "../config";

// interface BackendAck {
//   report: string;
// }

// export default function PhotoReportUploader() {
//   const [file, setFile] = useState<File | null>(null);
//   const [preview, setPreview] = useState<string | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState<string | null>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // build / clean preview url
//   useEffect(() => {
//     if (!file) return;
//     const url = URL.createObjectURL(file);
//     setPreview(url);
//     return () => URL.revokeObjectURL(url);
//   }, [file]);

//   const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const f = e.target.files?.[0];
//     if (f) {
//       setFile(f);
//       setMessage(null);
//     }
//   };

//   const submit = async () => {
//     if (!file) return;
//     setLoading(true);
//     try {

//       // const mainId = uuidv4().toString();
//       const mainId = Math.floor(100000 + Math.random() * 900000).toString();
//       const { lat, lon } = await getLocation();

//       const filePath = `${file.name}`;

//       const { data, error } = await supabase.storage
//         .from(BUCKET_NAME) 
//         .upload(filePath, file);
  
//       if (error) throw new Error("File upload failed: " + error.message);
  
//       const { data: publicUrlData } = supabase
//         .storage
//         .from(BUCKET_NAME)
//         .getPublicUrl(filePath);
  
//       const imageUrl = publicUrlData.publicUrl;

//       console.log(imageUrl);

//       const fd = new FormData();
//       fd.append("file", imageUrl);              
//       fd.append("latitude", lat.toString());
//       fd.append("longitude", lon.toString());

//       const res = await fetch("/api/generate-report", { method: "POST", body: fd });
//       if (!res.ok) throw new Error(`Server error ${res.status}`);
//       const json: BackendAck = await res.json();
//       setMessage(json.report || "Success!");
//       setFile(null);
//       setPreview(null);
//     } catch (err) {
//       setMessage(err instanceof Error ? err.message : "Unknown error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="mx-auto max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-lg">
//       <h1 className="text-2xl font-bold text-neutral-900">Snap‑to‑Report</h1>

//       {preview ? (
//         <img src={preview} alt="preview" className="h-56 w-full rounded-lg object-cover" />
//       ) : (
//         <label className="flex h-56 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-gray-500">
//           <span className="mb-2 text-sm">Tap to capture / choose photo</span>
//           <input
//             ref={inputRef}
//             type="file"
//             accept="image/*"
//             capture="environment"
//             className="hidden"
//             onChange={handleFile}
//           />
//         </label>
//       )}

//       {!preview && (
//         <button
//           type="button"
//           onClick={() => inputRef.current?.click()}
//           className="w-full rounded-lg bg-blue-600 py-2 text-white"
//         >
//           Select Photo
//         </button>
//       )}

//       {preview && (
//         <button
//           onClick={submit}
//           disabled={loading}
//           className="w-full rounded-lg bg-green-600 py-2 text-white disabled:opacity-50"
//         >
//           {loading ? "Submitting…" : "Submit Report"}
//         </button>
//       )}

//       {message && (
//         <p className="rounded-lg bg-green-100 p-3 text-center text-sm font-medium text-green-800">{message}</p>
//       )}
//     </div>
//   );
// }