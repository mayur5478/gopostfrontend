"use client";

import React, { useState, useEffect } from "react";
import { AccountType, SourcePost } from "../types";
import api from "@/lib/axios";
import { CHANNEL_URL } from "@/lib/urls";
import {
  Loader2,
  Image as ImageIcon,
  Video,
  Layers,
  AlertTriangle,
  FileVideo,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { format } from "date-fns";

// --- Helpers ---

// Helper to check if a string is an internal S3 key (not an external URL)
function isFileKey(url: string): boolean {
  if (!url) return false;
  return url.startsWith("uploads/") || (!url.includes("://") && !url.startsWith("data:"));
}

async function fetchPresignedUrl(
  fileKey: string,
  expirationMinutes: number = 30
): Promise<string> {
  if (!fileKey || !isFileKey(fileKey)) {
    return fileKey;
  }
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: {
        file_key: fileKey,
        expiration_minutes: expirationMinutes,
      },
    });
    return response.data.download_url;
  } catch (error) {
    console.error(`Failed to fetch presigned URL for ${fileKey}:`, error);
    return fileKey;
  }
}

// Simple helper to guess type if API didn't return it
function detectType(url: string): "video" | "image" | "text" {
  if (!url) return "text";
  const lower = url.toLowerCase();
  if (lower.match(/\.(mp4|mov|avi|webm|mkv)$/i)) return "video";
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) return "image";
  return "image"; // Default
}

function isImage(url: string): boolean {
    if (!url) return false;
    return !!url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i);
}

// --- API Fetch Function ---

async function fetchSourcePosts(channelId: number): Promise<SourcePost[]> {
  console.log(`Fetching real posts for channel ID: ${channelId}`);

  try {
    const response = await api.get(CHANNEL_URL.GET_CHANNEL_POSTS(channelId));

    if (!response.data) {
      return [];
    }

    // Handle both array (new APIView for external) and paginated object (old ViewSet for DB)
    const results = Array.isArray(response.data) 
      ? response.data 
      : response.data.results || [];

    const mappedPosts = await Promise.all(
      results.map(async (post: any): Promise<SourcePost> => {
        // 1. Extract Media URL
        let rawMediaUrl = post.media_url || post.mediaUrl || post.url || post.file || "";

        // 2. Extract Thumbnail
        let rawThumbnailKey = post.thumbnail_url || post.thumbnailUrl || post.thumbnail || "";

        // If it's an internal key (e.g. from DB posts), resolve it
        if (isFileKey(rawMediaUrl)) {
           rawMediaUrl = await fetchPresignedUrl(rawMediaUrl);
        }
        if (isFileKey(rawThumbnailKey)) {
           rawThumbnailKey = await fetchPresignedUrl(rawThumbnailKey);
        }

        // Fallback: If image type but no thumbnail, use media URL
        const type = post.type || detectType(rawMediaUrl);
        if (!rawThumbnailKey && (type === "image" || isImage(rawMediaUrl))) {
          rawThumbnailKey = rawMediaUrl;
        }

        // 3. Extract Description
        const description =
          post.description ||
          post.caption ||
          post.text ||
          post.summary ||
          post.content?.description ||
          post.metadata?.description ||
          "";

        // 4. Extract Title (Fallback to truncated description)
        let title = post.title;
        if (!title && description) {
           title = description.length > 50 ? description.substring(0, 50) + "..." : description;
        }
        if (!title) title = "Untitled Post";

        return {
          id: post.id, // This is the external ID (e.g., YouTube ID, LinkedIn URN)
          mediaUrl: rawMediaUrl,
          thumbnailUrl: rawThumbnailKey || "",
          title: title,
          description: description,
          hashtags: post.tags || post.hashtags || [],
          created_at: post.created_at || new Date().toISOString(),
          type: type,
          platform: post.platform || "unknown",
        };
      })
    );

    return mappedPosts;
  } catch (error) {
    console.error("Error in fetchSourcePosts:", error);
    throw error;
  }
}

// --- Component Props ---

interface ThirdStepCrossPostProps {
  sourceAccount: AccountType | null;
  selectedCrossPosts: SourcePost[];
  setSelectedCrossPosts: React.Dispatch<React.SetStateAction<SourcePost[]>>;
}

// --- Main Component ---

export default function ThirdStepCrossPost({
  sourceAccount,
  selectedCrossPosts,
  setSelectedCrossPosts,
}: ThirdStepCrossPostProps) {
  const [sourcePosts, setSourcePosts] = useState<SourcePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceAccount) {
      setError("No source account selected. Please go back to Step 2.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetchSourcePosts(sourceAccount.id)
      .then((posts) => {
        setSourcePosts(posts);
      })
      .catch((err) => {
        console.error("Failed to fetch source posts:", err);
        setError(
          `Failed to fetch posts from ${sourceAccount.channel_type}. Please check your connection permissions.`
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [sourceAccount]);

  const toggleSelectPost = (post: SourcePost) => {
    setSelectedCrossPosts((prev) => {
      const isSelected = prev.some((p) => p.id === post.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== post.id);
      } else {
        return [...prev, post];
      }
    });
  };

  const getIconForType = (type: SourcePost["type"]) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-gray-500" />;
      case "carousel":
        return <Layers className="h-4 w-4 text-gray-500" />;
      case "image":
        return <ImageIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ImageIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center items-center mt-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#FDE047]" />
          <p className="text-gray-600 font-medium">
            Fetching posts from {sourceAccount?.username}...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center items-center mt-20 px-4">
        <div className="flex flex-col items-center gap-3 bg-red-50 p-6 rounded-lg border border-red-200 text-center max-w-md">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-red-700 font-medium">{error}</p>
          <p className="text-xs text-red-500">Try reconnecting the account in the Connections tab.</p>
        </div>
      </div>
    );
  }

  if (sourcePosts.length === 0) {
    return (
      <div className="w-full flex justify-center items-center mt-20 px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-gray-600 font-medium">
            No posts found for {sourceAccount?.username}.
          </p>
          <p className="text-sm text-gray-400">
            (Only media posts or recently active posts may be shown)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center mt-8 px-4 md:px-0 mb-8">
      <div className="w-full max-w-4xl flex-1">
        <div className="mb-6">
          <h2 className="text-xl font-semibold leading-[100%] tracking-[-0.21px] text-[#000001E3]">
            Select Posts to Cross-Post
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Showing posts from {sourceAccount?.username} ({sourceAccount?.channel_type}). 
            Select content to publish to your destinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sourcePosts.map((post) => {
            const isSelected = selectedCrossPosts.some((p) => p.id === post.id);
            
            // Format Date
            let formattedDate = "";
            try {
              if (post.created_at) {
                formattedDate = format(new Date(post.created_at), "MMM d, yyyy");
              }
            } catch (e) {
                // ignore invalid dates
            }

            // Determine Image Source for Preview
            // Prefer thumbnail, fallback to mediaUrl if it looks like an image
            const previewImage = post.thumbnailUrl || (isImage(post.mediaUrl) ? post.mediaUrl : null);

            return (
              <div
                key={post.id}
                onClick={() => toggleSelectPost(post)}
                className={`w-full border rounded-xl p-4 bg-white flex items-start gap-4 cursor-pointer transition-all hover:shadow-md ${
                  isSelected
                    ? "border-[#FDE047] ring-1 ring-[#FDE047] bg-[#FDE047]/5"
                    : "border-[#E5E5E5]"
                }`}
              >
                <Checkbox
                  id={`checkbox-${post.id}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleSelectPost(post)}
                  className="mt-1 border-2 border-[#E1E4EA] w-5 h-5 flex-shrink-0 data-[state=checked]:bg-[#FDE047] data-[state=checked]:text-black data-[state=checked]:border-[#FDE047]"
                />

                <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 flex items-center justify-center">
                  {previewImage ? (
                    <Image
                      src={previewImage}
                      alt="Post thumbnail"
                      fill // FIXED: Use 'fill' prop for Next.js 13+
                      className="object-cover" // FIXED: Use Tailwind class for styling
                      unoptimized={true} // CRITICAL FIX: This stops Next.js from proxying/optimizing external images, preventing 429 errors
                      onError={(e) => {
                        // Hide image on error and show icon
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement?.querySelector(".fallback-icon")?.classList.remove("hidden");
                      }}
                    />
                  ) : null}
                  
                  {/* Fallback Icon (shown if no image or image fails) */}
                  <div className={`fallback-icon ${previewImage ? "hidden" : ""} text-gray-400`}>
                    {post.type === "video" ? (
                      <FileVideo size={28} />
                    ) : (
                      <ImageIcon size={28} />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {getIconForType(post.type)}
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {post.type || "Post"}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-[#000001E3] line-clamp-2 leading-snug" title={post.title}>
                      {post.title}
                    </span>
                  </div>
                  {formattedDate && (
                    <p className="text-xs text-[#5B5B64] mt-2">
                      {formattedDate}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



