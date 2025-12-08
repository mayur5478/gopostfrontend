"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import Image from "next/image";
import { Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { CHANNEL_URL } from "@/lib/urls";

export interface MediaItem {
  id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  created_at: string | null;
  file_key: string | null;
}

interface LibraryImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (selectedMedia: MediaItem[]) => void;
  isCarousel: boolean;
}

export default function LibraryImportModal({
  open,
  onOpenChange,
  onImport,
  isCarousel,
}: LibraryImportModalProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Pagination State ---
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const LIMIT = 6; // Limit items to 6 per page

  const fetchMediaItems = useCallback(async () => {
    if (!open) return;
    setIsLoading(true);
    try {
      const offset = page * LIMIT;
      const response = await api.get(CHANNEL_URL.MEDIA_LIBRARY, {
        params: { limit: LIMIT, offset: offset },
      });

      if (response.data && response.data.data) {
        const mappedItems: MediaItem[] = response.data.data.map((item: any) => ({
          id: item.id,
          file_url: item.url,
          file_type: item.media_type,
          file_name: item.name || "Untitled",
          file_size: item.size ?? null,
          created_at: item.created_at ?? null,
          file_key: item.file ?? null,
        }));
        setMediaItems(mappedItems);
        setTotalCount(response.data.count || 0);
      } else {
        setMediaItems([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Failed to fetch media items:", error);
      toast.error("Could not load your library.");
    } finally {
      setIsLoading(false);
    }
  }, [open, page]);

  useEffect(() => {
    fetchMediaItems();
  }, [fetchMediaItems]);

  useEffect(() => {
    if (!open) {
      setSelectedMedia([]);
      setPage(0);
    }
  }, [open]);

  // const handleSelectMedia = (item: MediaItem) => {
  //   setSelectedMedia((prev) => {
  //     const isSelected = prev.some((m) => m.id === item.id);
  //     if (isSelected) {
  //       return prev.filter((m) => m.id !== item.id);
  //     } else {
  //       if (isCarousel) {
  //         return [...prev, item];
  //       } else {
  //         return [item]; 
  //       }
  //     }
  //   });
  // };
  const handleSelectMedia = (item: MediaItem) => {
    setSelectedMedia((prev) => {
      const isSelected = prev.some((m) => m.id === item.id);
      if (isSelected) {
        return prev.filter((m) => m.id !== item.id);
      } else {
          return [...prev, item];
        
      }
    });
  };
  const handleConfirmImport = () => {
    if (selectedMedia.length === 0) {
      toast.error("Please select at least one item to import.");
      return;
    }
    onImport(selectedMedia);
    onOpenChange(false);
  };

  const getFileName = (item: MediaItem) => {
    return item.file_name || 'Untitled';
  }

  const totalPages = Math.ceil(totalCount / LIMIT);
// You can tweak these if needed:
const ROW_PADDING = 24 * 2; // top+bottom padding inside scroll area
const GAP = 16;            // grid gap
const LABEL = 40;          // bottom label height
const EXTRA_PREVIEW = 20;   // show top of second row

// Compute card width dynamically using container width:
const CARD_SIZE = 320; // realistic value for sm:max-w-4xl

// height for exactly ONE row:
const oneRowHeight = CARD_SIZE + LABEL + GAP + ROW_PADDING + EXTRA_PREVIEW;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl min-h-0 flex flex-col rounded-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Import from Library</DialogTitle>
            {totalCount > 0 && (
               <span className="text-xs text-gray-500 mr-8">
                 Page {page + 1} of {totalPages} ({totalCount} items)
               </span>
            )}
          </div>
          <DialogDescription>
            {isCarousel
              ? "Select one or more items to add to your post."
              : "Select one item to use for your post."}
          </DialogDescription>
        </DialogHeader>
{/* Scrollable Content Area */}
<div
  className="bg-gray-50/50"
  style={{
    height: oneRowHeight 
    // overflow: "hidden",
  }}
>  <ScrollArea className="h-full w-full">
    <div className="p-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin mr-2 text-[#FDE047]" />
          Loading...
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
          <p>No items found.</p>
          <p className="text-xs">Try uploading some media first.</p>
        </div>
      ) : (
<div className="grid grid-cols-3 gap-x-4 gap-y-8">
          {mediaItems.map((item) => {
            const isSelected = selectedMedia.some((m) => m.id === item.id);

            return (
<div
  key={item.id}
  onClick={() => handleSelectMedia(item)}
  className={`relative border rounded-xl overflow-hidden group cursor-pointer shadow-sm hover:shadow-md transition-all ${
    isSelected ? "ring-2 ring-[#FDE047] ring-offset-1" : "border-gray-200"
  }`}
>
  <div className="relative aspect-square bg-gray-200">
    {item.file_type?.startsWith("image") ? (
      <Image
        src={item.file_url}
        alt={getFileName(item)}
        fill
        className={`object-cover transition-all duration-300 ${
          isSelected ? "scale-105 opacity-90" : "group-hover:scale-105"
        }`}
        onError={(e) => (e.currentTarget.src = "/placeholder-image.png")}
      />
    ) : (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <video
          src={item.file_url}
          className="w-full h-full object-cover opacity-80"
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm7.414 7.075L8 13.15V6.85l3.414 2.075a.5.5 0 010 .85z"></path>
            </svg>
          </div>
        </div>
      </div>
    )}

    {isSelected && (
      <div className="absolute top-2 right-2 z-10">
        <div className="w-6 h-6 rounded-full bg-[#FDE047] flex items-center justify-center shadow-sm">
          <Check size={14} color="#181818" strokeWidth={3} />
        </div>
      </div>
    )}
  </div>

  <div className="p-2 bg-white">
    <p
      className="text-xs font-medium text-gray-700 truncate"
      title={getFileName(item)}
    >
      {getFileName(item)}
    </p>
  </div>
</div>

            );
          })}
        </div>
      )}
    </div>
  </ScrollArea>
</div>


        {/* Footer with Pagination */}
        <DialogFooter className="p-4 border-t bg-white flex items-center justify-between sm:justify-between w-full">
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="h-9 px-3"
                >
                    <ChevronLeft className="h-4 w-4 mr-1"/> Previous
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * LIMIT >= totalCount || isLoading}
                    className="h-9 px-3"
                >
                    Next <ChevronRight className="h-4 w-4 ml-1"/>
                </Button>
            </div>

            <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button
                    onClick={handleConfirmImport}
                    disabled={selectedMedia.length === 0}
                    className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black px-6"
                >
                    Import {selectedMedia.length > 0 ? `(${selectedMedia.length})` : ""}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}