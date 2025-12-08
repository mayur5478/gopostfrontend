"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { FolderPlus, Upload, Search, ListFilter, MoreVertical, Loader2 } from "lucide-react";
import { SiGoogledrive } from "react-icons/si";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { CHANNEL_URL } from "@/lib/urls";


interface MediaItem {
  id: number;
  file_url: string;
  file_type: string;
  file_name: string;
  size: number;
  created_at: string;
}

export default function LibraryPage() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

   const fetchMediaItems = useCallback(async () => {
  setIsLoading(true);

  try {
    const response = await api.get(CHANNEL_URL.MEDIA_LIBRARY, {
      params: {
        limit: 100,
        offset: 0,
      },
    });

    if (response.data && response.data.data) {
      const mappedItems: MediaItem[] = response.data.data.map((item: any) => ({
        id: item.id,
        file_url: item.url,                    // <-- signed URL from backend
        file_type: item.media_type,
        file_name: item.name || "Untitled",
        size: item.size || 0,
        created_at: item.created_at,
      }));
      setMediaItems(mappedItems);
    } else {
      setMediaItems([]);
    }
  } catch (error) {
    console.error("Failed to fetch media items:", error);
    toast.error("Could not load your library. Please try again.");
    setMediaItems([]);
  } finally {
    setIsLoading(false);
  }
}, []);


  useEffect(() => {
    fetchMediaItems();
  }, [fetchMediaItems]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadToast = toast.loading(`Uploading ${files.length} file(s)...`);

    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(CHANNEL_URL.S3_FILE_UPLOAD, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.status < 200 || response.status >= 300)
       throw new Error("Upload failed");

        if (response.status !== 201) throw new Error("Upload failed");
        return { success: true, name: file.name };
      } catch (error) {
        console.error("Upload failed:", error);
        return { success: false, name: file.name };
      }
    });

    const results = await Promise.all(uploadPromises);
    toast.dismiss(uploadToast);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file(s).`);
      await fetchMediaItems();
    }
    if (failureCount > 0) toast.error(`Failed to upload ${failureCount} file(s).`);

    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsUploading(false);
  };

  const filteredMediaItems = mediaItems.filter((item) =>
    item.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Library</h1>
          <p className="text-sm text-gray-500">
            One place to link, control, and grow every social account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 border-gray-300">
            <ListFilter className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6 flex-shrink-0 border-b pb-4">
        <Button
          className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black gap-2 h-9 px-4 rounded-lg"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? "Uploading..." : "Upload or drop"}
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" disabled className="gap-2 h-9 px-4 rounded-lg border-gray-300 text-gray-700">
              <FolderPlus className="h-4 w-4" /> Create folder
            </Button>
          </DialogTrigger>
        </Dialog>

        <Button
          variant="outline"
          className="gap-2 h-9 px-4 rounded-lg border-gray-300 text-gray-700"
          disabled
        >
          <SiGoogledrive className="h-4 w-4 text-green-600" /> Import from Google Drive
        </Button>
      </div>

      {/* Media Grid */}
      <div className="flex-grow overflow-y-auto -mr-6 pr-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading your library...
          </div>
        ) : filteredMediaItems.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            {searchTerm ? "No files found." : "Your library is empty. Upload some media!"}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredMediaItems.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg overflow-hidden group relative cursor-pointer hover:shadow-md transition-shadow bg-white"
              >
                <div className="relative aspect-square bg-gray-100">
                  {item.file_type?.startsWith("image") ? (
                    <img
                      src={item.file_url}
                      alt={item.file_name}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => (e.currentTarget.src = "/placeholder-image.png")}
                    />
                  ) : item.file_type?.startsWith("video") ? (
                    <video
                      src={item.file_url}
                      className="w-full h-full object-cover"
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-xl font-bold">
                      ?
                    </div>
                  )}
                </div>
                <div className="p-2 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-medium truncate text-gray-700" title={item.file_name}>
                      {item.file_name}
                    </p>
                    <p className="text-gray-500">{item.file_type}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
