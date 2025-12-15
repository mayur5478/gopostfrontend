"use client";

import { Checkbox } from "@/components/ui/checkbox";
import Post from "../Posts/Post";
import React, { useRef, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { AgentData } from "../../list/types";
import { PostType, AccountType } from "../../create/types";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import PostSetting from "@/app/(authenticated)/postsetting/PostSetting";
import { Loader2 } from "lucide-react";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";

async function fetchPresignedUrl(fileKey: string, expiration = 30) {
  try {
    const res = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: { file_key: fileKey, expiration_minutes: expiration },
    });
    return res.data.download_url;
  } catch (err) {
    console.error("Presigned URL fetch failed:", err);
    return fileKey; // fallback
  }
}

function isFileKey(url: string) {
  if (!url) return false;
  return url.startsWith("uploads/") || !url.includes("://");
}

type Props = {
  AgentData: AgentData;
  selectedPosts: PostType[];
  setSelectedPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  refreshKey: number;
  onRefresh: () => void; 
};

export default function Approved(props: Props) {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  const [openPostSetting, setOpenPostSetting] = useState(false);
  const [clickedPost, setClickedPost] = useState<PostType | null>(null);

  const selectedPosts = props.selectedPosts ?? [];
  const postsArr = posts ?? [];

  async function fetchPostsOfAnAgent() {
    try {
      setLoading(true);

      const channelRes = await api.get(CHANNEL_URL.GET_CHANNEL);
      const channels = channelRes.data.results;

      const { data } = await api.get(AGENT_URLS.POSTS(props.AgentData.id));

      const allPosts: PostType[] = await Promise.all(
        data.results
          .filter((master: any) =>
            master.channel_posts.some((p: any) => p.status === "approved")
          )
          .map(async (master: any) => {
            
            // 1. Handle Master Media URL
            let originalMediaUrl = master.original_media_url;
            const isInternalOriginal = isFileKey(originalMediaUrl);

            if (isInternalOriginal) {
              originalMediaUrl = await fetchPresignedUrl(originalMediaUrl);
            }

            // 2. Process Child Posts
            const postsForMaster = await Promise.all(
              master.channel_posts
                .filter((p: any) => p.status === "approved") // Filter inner posts
                .map(async (post: any) => {
                  const platform = channels.find(
                    (ch: AccountType) => ch.id === post.channel
                  );

                  let mediaUrl = post.media_url;
                  let thumb = post.thumbnail_url;

                  if (mediaUrl && isFileKey(mediaUrl)) {
                    mediaUrl = await fetchPresignedUrl(mediaUrl);
                  }
                  if (thumb && isFileKey(thumb)) {
                    thumb = await fetchPresignedUrl(thumb);
                  }

                  return {
                    postId: post.post_id,
                    title: post.title,
                    mediaUrl,
                    thumbnailUrl: thumb,
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
                    metadata: post.metadata,
                    scheduleTime: post.scheduled_time,
                    dates: post.updated_at,
                    platform,
                    status: post.status,
                  };
                })
            );

            // 3. --- FIX: Fallback for Preview Image ---
            if ((!originalMediaUrl || !isInternalOriginal) && postsForMaster.length > 0) {
                 originalMediaUrl = postsForMaster[0].thumbnailUrl || postsForMaster[0].mediaUrl || originalMediaUrl;
            }

            return {
              mainId: master.id,
              agent: master.agent,
              mediaUrl: originalMediaUrl,
              posts: postsForMaster,
            };
          })
      );

      // Filter empty masters
      setPosts(allPosts.filter(p => p.posts.length > 0));

    } catch (err) {
      console.error("Fetch posts failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPostsOfAnAgent();
  }, [props.AgentData, props.refreshKey]);

  const toggleSelect = (post: PostType) => {
    props.setSelectedPosts((prev) => {
      if (prev.some((p) => p.mainId === post.mainId)) {
        return prev.filter((p) => p.mainId !== post.mainId);
      }
      return [...prev, post];
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      props.setSelectedPosts(postsArr);
    } else {
      props.setSelectedPosts([]);
    }
  };

  const selectAllChecked =
    postsArr.length > 0 && selectedPosts.length === postsArr.length;

  const selectAllPartial =
    selectedPosts.length > 0 && selectedPosts.length < postsArr.length;

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
        <p className="text-base animate-pulse">Getting Approved posts...</p>
      </div>
    );

  if (!loading && postsArr.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">No Approved posts found</p>
      </div>
    );
  }

  return (
    <div className="allContent flex flex-col w-full p-[1.3rem]">
      {/* Select All */}
      <div className="flex gap-3 w-full mb-3">
        <Checkbox
          ref={selectAllRef}
          className="border-2 border-[#E1E4EA]"
          checked={selectAllChecked}
          onCheckedChange={(checked: boolean) => toggleSelectAll(checked)}
        />
        <Label htmlFor="selectAll" className="cursor-pointer w-full">
          Select All ({selectedPosts.length} selected)
        </Label>
      </div>

      {/* Posts List */}
      <div className="flex flex-col gap-3 w-full">
        {postsArr.map((card) => (
          <div key={card.mainId} className="flex items-center space-x-3 w-full">
            <Checkbox
              className="border-2 border-[#E1E4EA]"
              checked={selectedPosts.some((p) => p.mainId === card.mainId)}
              onCheckedChange={() => toggleSelect(card)}
            />
            <Label className="cursor-pointer w-full" onClick={() => {}}>
              <Post
                postDetails={card}
                posts={postsArr}
                // onRefresh={fetchPostsOfAnAgent}
                onEdit={() => {
                  setClickedPost(card);
                  setOpenPostSetting(true);
                }}
              />
            </Label>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Dialog open={openPostSetting} onOpenChange={setOpenPostSetting}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />
          <div className="fixed inset-0 w-screen h-screen bg-white overflow-y-auto z-50 rounded-t-xl shadow-lg">
            {clickedPost ? (
              <PostSetting
                key={clickedPost.mainId}
                post={clickedPost}
                posts={postsArr}
                onClose={() => {
                  setOpenPostSetting(false);
                  fetchPostsOfAnAgent();
                }}
                onSave={() => props.onRefresh()}   // new line
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