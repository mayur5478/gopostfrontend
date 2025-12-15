"use client";

import { Checkbox } from "@/components/ui/checkbox";
import Post from "../../Posts/Post";
import React, { useRef, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { AgentData } from "../../../list/types";
import {
  AccountType,
  PostType
} from "../../../create/types";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";

// --- CHANGED: Import the NEW CrossPostSetting component ---
import CrossPostSetting from "@/app/(authenticated)/postsetting/CrossPostSetting"; 

// Utility function to fetch presigned URL from file_key
async function fetchPresignedUrl(
  fileKey: string,
  expirationMinutes: number = 30
): Promise<string> {
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: {
        file_key: fileKey,
        expiration_minutes: expirationMinutes,
      },
    });
    return response.data.download_url;
  } catch (error) {
    console.error("Failed to fetch presigned URL:", error);
    return fileKey;
  }
}

function isFileKey(url: string): boolean {
  if (!url) return false;
  return url.startsWith("uploads/") || !url.includes("://");
}

type Props = {
  AgentData: AgentData;
  selectedCrossPosts: PostType[];
  setSelectedCrossPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  refreshKey: number;
};

export default function CrossPostAll(props: Props) {
  const [openPostSetting, setOpenPostSetting] = useState(false);
  const [clickedPost, setClickedPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostType[]>([]);

  const selectedPosts = props.selectedCrossPosts ?? [];

  async function fetchPostsOfAnAgent() {
    try {
      setLoading(true);
      let channel = await api.get(CHANNEL_URL.GET_CHANNEL);
      const channelsData = channel.data.results || [];

      const { data } = await api.get(AGENT_URLS.POSTS(props.AgentData.id));

      const allPosts: PostType[] = await Promise.all(
        data.results.flatMap(async (masterPost: any) => {
          
            let originalMediaUrl = masterPost.original_media_url;
            const isInternalOriginal = isFileKey(originalMediaUrl);

            if (isInternalOriginal) {
              try {
                originalMediaUrl = await fetchPresignedUrl(originalMediaUrl);
              } catch (error) {
                console.error(`Failed to fetch presigned URL for ${masterPost.original_media_url}:`, error);
              }
            }

            const posts = await Promise.all(
              masterPost.channel_posts.map(async (post: any) => {
                const platform = channelsData.find(
                  (ch: AccountType) => ch.id == post.channel
                );
                
                let fullMediaUrl = post.media_url;
                if (fullMediaUrl && isFileKey(fullMediaUrl)) {
                  fullMediaUrl = await fetchPresignedUrl(fullMediaUrl);
                }

                let fullThumbnailUrl = post.thumbnail_url;
                if (fullThumbnailUrl && isFileKey(fullThumbnailUrl)) {
                  fullThumbnailUrl = await fetchPresignedUrl(fullThumbnailUrl);
                }

                return {
                  postId: post.post_id,
                  title: post.title,
                  mediaUrl: fullMediaUrl,
                  status: post.status,
                  content: post.content,
                  caption: Array.isArray(post.caption)
                    ? post.caption
                    : post.caption
                      ? [post.caption]
                      : [],

                  tags: Array.isArray(post.tags)
                    ? post.tags
                    : post.tags
                      ? [post.tags]
                      : [],
                  thumbnailUrl: fullThumbnailUrl,
                  resize: post.resize,
                  metadata: post.metadata,
                  scheduleTime: post.scheduled_time,
                  dates: post.updated_at,
                  platform: platform,
                };
              })
            );

            if ((!originalMediaUrl || !isInternalOriginal) && posts.length > 0) {
               originalMediaUrl = posts[0].thumbnailUrl || posts[0].mediaUrl || originalMediaUrl;
            }

            return {
              mainId: masterPost.id,
              agent: masterPost.agent,
              mediaUrl: originalMediaUrl,
              posts: posts,
            };
          
        })
      );

      setPosts((prev) => {
        const sameLength = prev.length === allPosts.length;
        const sameIds = sameLength && prev.every((p, i) => p.mainId === allPosts[i].mainId);
        if (sameIds) return prev;
        return allPosts;
      });

    } catch (err) {
      console.error("Failed to fetch cross posts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPostsOfAnAgent();
  }, [props.AgentData, props.refreshKey]);

  const handleEditClick = (post: PostType) => {
    setClickedPost(post);
    setOpenPostSetting(true);
  };

  const toggleSelect = (post: PostType) => {
    props.setSelectedCrossPosts((prevSelected) => {
      const isAlreadySelected = prevSelected.some(
        (p) => p.mainId === post.mainId
      );
      if (isAlreadySelected) {
        return prevSelected.filter((p) => p.mainId !== post.mainId);
      } else {
        return [...prevSelected, post];
      }
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      props.setSelectedCrossPosts(posts);
    } else {
      props.setSelectedCrossPosts([]);
    }
  };

  const selectAllChecked =
    selectedPosts.length === posts.length && posts.length > 0;
  
  const selectAllPartial =
    selectedPosts.length > 0 && selectedPosts.length < posts.length;

  const selectAllRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (selectAllRef.current) {
      (selectAllRef.current as any).indeterminate = selectAllPartial;
    }
  }, [selectAllPartial]);

  if (loading)
    return (
      <div className="w-full flex-1 flex flex-col justify-center items-center text-xl text-gray-600 animate-fadeIn">
        <Loader2 className="h-10 w-10 animate-spin text-[#FDE047] mb-3" />
        <p className="text-base animate-pulse">Getting cross posts...</p>
      </div>
    );

  if (!loading && posts.length === 0) {
    return (
        <div className="w-full flex flex-col justify-center items-center py-10 text-gray-500">
            <p>No posts found for this agent.</p>
        </div>
    )
  }

  return (
    <div className="allContent flex flex-col w-full p-[1.3rem]">
      <div className="flex gap-3 w-full mb-3">
        <Checkbox
          ref={selectAllRef}
          className="border-2 border-[#E1E4EA]"
          id="selectAll"
          checked={selectAllChecked}
          onCheckedChange={(checked: boolean) => toggleSelectAll(checked)}
        />
        <Label htmlFor="selectAll" className="cursor-pointer w-full">
          Select All ({selectedPosts.length} selected)
        </Label>
      </div>
      <div className="flex flex-col gap-3 w-full">
        {posts
          .filter((card) => card && card.mainId) 
          .map((card: PostType) => (
            <div
              key={card.mainId}
              className="flex items-center space-x-3 w-full"
            >
              <Checkbox
                className="border-2 border-[#E1E4EA]"
                id={card.mainId}
                checked={selectedPosts.some(
                  (p) => p.mainId === card.mainId
                )}
                onCheckedChange={() => toggleSelect(card)}
              />
              <Label
                htmlFor={card.mainId}
                className="cursor-pointer w-full"
              >
                <Post
                  postDetails={card}
                  posts={posts}
                  onEdit={() => handleEditClick(card)}
                />
              </Label>
            </div>
          ))}
      </div>

      <Dialog open={openPostSetting} onOpenChange={(open) => setOpenPostSetting(open)}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />
          <div className="fixed inset-0 w-screen h-screen bg-white rounded-t-xl shadow-lg overflow-y-auto z-50 animate-in slide-in-from-bottom-10">
            {clickedPost ? (
              // --- CHANGED: Use CrossPostSetting here ---
              <CrossPostSetting
                key={clickedPost.mainId}
                post={clickedPost}
                posts={posts}
                onClose={() => {
                  setOpenPostSetting(false);
                  fetchPostsOfAnAgent();
                }}
              />
            ) : (
              <div className="p-6">No post selected</div>
            )}
          </div>
        </DialogPortal>
      </Dialog>
    </div>
  );
}