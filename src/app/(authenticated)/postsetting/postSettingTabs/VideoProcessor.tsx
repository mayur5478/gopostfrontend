"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/lib/axios"; // Use alias
import { MEDIA_ENGINE_URLS } from "@/lib/urls"; // Use alias
import { toast } from "react-hot-toast";
import { Loader2, UploadCloud, Image as ImageIcon, Video, MessageSquareText } from "lucide-react";

// This interface matches the JSON response from your ai.py pipeline
interface PipelineResult {
  ai_thumbnail: string | null;
  frame_thumbnail: string | null;
  resized: {
    vertical?: string;
    square?: string;
    landscape?: string;
  };
  transcription: string | null; 
}

export default function VideoProcessor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null); // Clear previous results
    }
  };

  const handleUploadAndProcess = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    toast.loading("Processing video... this may take a moment.");

    try {
      // --- 1. Create FormData for Thumbnail API ---
      const thumbFormData = new FormData();
      thumbFormData.append("file", selectedFile);
      thumbFormData.append("title_text", "My Awesome Video");
      thumbFormData.append("tone", "energetic");

      // --- 2. Create FormData for Resize API ---
      const resizeFormData = new FormData();
      resizeFormData.append("file", selectedFile);
      resizeFormData.append("presets", "vertical,square");

      // --- 3. Create FormData for Transcribe API ---
      const transcribeFormData = new FormData();
      transcribeFormData.append("file", selectedFile);

      // --- 4. Call APIs in parallel ---
      const thumbnailPromise = api.post(
        MEDIA_ENGINE_URLS.THUMBNAIL,
        thumbFormData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const resizePromise = api.post(
        MEDIA_ENGINE_URLS.RESIZE_MEDIA,
        resizeFormData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const transcribePromise = api.post(
        MEDIA_ENGINE_URLS.TRANSCRIBE,
        transcribeFormData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      // Wait for all three to complete
      const [thumbnailResponse, resizeResponse, transcribeResponse] = await Promise.all([
        thumbnailPromise,
        resizePromise,
        transcribePromise,
      ]);

      // --- 5. Combine results into the "PipelineResult" format ---
      const newResult: PipelineResult = {
        frame_thumbnail: thumbnailResponse.data.thumbnail_path,
        resized: resizeResponse.data.resized_videos,
        transcription: transcribeResponse.data.transcription,
        ai_thumbnail: null, 
      };

      setResult(newResult);
      toast.dismiss(); // Close loading toast
      toast.success("Video processed successfully!");
    } catch (error: any) {
      console.error("Error processing video:", error);
      toast.dismiss();
      toast.error(
        error.response?.data?.error || "Failed to process video."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const thumbnailUrl = result?.ai_thumbnail || result?.frame_thumbnail;
  const downloadUrl = result?.resized?.vertical || result?.resized?.square;

  return (
    <div className="w-full max-w-lg p-6 mx-auto mt-10 border rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Video Processor (Test UI)</h2>

      <div className="flex flex-col gap-4">
        <Input type="file" accept="video/*" onChange={handleFileChange} />

        <Button
          onClick={handleUploadAndProcess}
          disabled={isLoading || !selectedFile}
          className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Processing..." : "Upload and Process"}
        </Button>
      </div>

      {result && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Processing Complete!</h3>

          {/* 1. Display thumbnails */}
          {thumbnailUrl ? (
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Generated Thumbnail:</p>
              <img
                src={thumbnailUrl}
                alt="Generated Thumbnail"
                className="w-full max-w-xs rounded-md border"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-md text-gray-500">
              <ImageIcon className="h-4 w-4" />
              <span>No thumbnail was generated.</span>
            </div>
          )}

          {/* 2. Provide download buttons */}
          {downloadUrl ? (
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Resized Video:</p>
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Video className="mr-2 h-4 w-4" />
                  Download Resized Video (Vertical/Square)
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-md text-gray-500">
              <Video className="h-4 w-4" />
              <span>No resized video was generated.</span>
            </div>
          )}

          {/* 3. Display Transcription */}
          {result.transcription ? (
            <div className="mb-4">
              <p className="text-sm font-medium mb-1">Generated Transcription (Subtitles):</p>
              <textarea
                readOnly
                value={result.transcription}
                className="w-full h-32 p-2 border rounded-md bg-gray-50 text-sm font-mono"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-md text-gray-500">
              <MessageSquareText className="h-4 w-4" />
              <span>No transcription was generated (is the video silent?).</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}