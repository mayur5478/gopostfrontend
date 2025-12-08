"use client";

import { Checkbox } from "@/components/ui/checkbox";
import Post from "../../Posts/Post";
import React, { useRef } from "react";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { useEffect, useState } from "react";
import { AgentData } from "../../../list/types";
import {
  AccountType,
  PostType
} from "../../../create/types";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import PostSetting from "@/app/(authenticated)/postsetting/PostSetting";
import { Loader2, X } from "lucide-react";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";

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
    // Return the file_key as fallback if presigned URL fetch fails
    return fileKey;
  }
}

// Helper function to check if a URL is an S3 file key (starts with "uploads/")
function isFileKey(url: string): boolean {
  return url.startsWith("uploads/") || !url.includes("://");
}

type Props = {
  AgentData: AgentData;
  selectedPosts: PostType[];
  setSelectedPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  refreshKey: number;
};

export default function AllPostFromComp(props: Props) {
  const [openPostSetting, setOpenPostSetting] = useState(false);
  const [clickedPost, setClickedPost] = useState<PostType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostType[]>([]);

  async function fetchPostsOfAnAgent() {
    try {
      setLoading(true);
      //get all channels of this user
      let channel = await api.get(CHANNEL_URL.GET_CHANNEL);
      console.log("get all channels", channel.data.results);
      const { data } = await api.get(AGENT_URLS.POSTS(props.AgentData.id));

      // Correctly flatten the nested post structure
      const allPosts: PostType[] = await Promise.all(
        data.results.flatMap(async (masterPost: any) => {
          {
            // Fetch presigned URL for original_media_url if it's a file key
            let originalMediaUrl = masterPost.original_media_url;
            if (originalMediaUrl && isFileKey(originalMediaUrl)) {
              try {
                originalMediaUrl = await fetchPresignedUrl(originalMediaUrl);
              } catch (error) {
                console.error(
                  `Failed to fetch presigned URL for ${masterPost.original_media_url}:`,
                  error
                );
              }
            }

            const posts = await Promise.all(
              masterPost.channel_posts.map(async (post: any) => {
                const platform = channel.data.results.find(
                  (ch: AccountType) => ch.id == post.channel
                );
                // Use the media URL directly (backend should return full URLs)
                let fullMediaUrl = post.media_url;
                if (fullMediaUrl && isFileKey(fullMediaUrl)) {
                  try {
                    fullMediaUrl = await fetchPresignedUrl(fullMediaUrl);
                  } catch (error) {
                    console.error(
                      `Failed to fetch presigned URL for ${post.media_url}:`,
                      error
                    );
                  }
                }
                let fullThumbnailUrl = post.thumbnail_url;
                if (fullThumbnailUrl && isFileKey(fullThumbnailUrl)) {
                  try {
                    fullThumbnailUrl = await fetchPresignedUrl(
                      fullThumbnailUrl
                    );
                  } catch (error) {
                    console.error(
                      `Failed to fetch presigned URL for ${post.media_url}:`,
                      error
                    );
                  }
                }
                return {
                  postId: post.post_id,
                  title: post.title,
                  mediaUrl: fullMediaUrl,
                  status: post.status,
                  content:post.content,
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
            return {
              mainId: masterPost.id,
              agent: masterPost.agent,
              mediaUrl: originalMediaUrl,
              posts: posts,
            };
          }
        })
      );

      setPosts((prev) => {
        const sameLength = prev.length === allPosts.length;
        const sameIds = sameLength && prev.every((p, i) => p.mainId === allPosts[i].mainId);
        if (sameIds) return prev;
        return allPosts;
      });

      console.log("response inside All tab data here", allPosts);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // setLoading(true);
    fetchPostsOfAnAgent();
  
  }, [props.AgentData, props.refreshKey]);

  const handleEditClick = (post: PostType) => {
    console.log("AllPostFromComp: opening modal for", post.mainId);
    setClickedPost(post);
    setOpenPostSetting(true);
  };

  const toggleSelect = (post: PostType) => {
    props.setSelectedPosts((prevSelected) => {
      const isAlreadySelected = prevSelected.some(
        (p) => p.mainId === post.mainId
      );
      if (isAlreadySelected) {
        // remove the post
        return prevSelected.filter((p) => p.mainId !== post.mainId);
      } else {
        // add the post
        return [...prevSelected, post];
      }
    });
  };

  //  Select or deselect all
  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all posts
      props.setSelectedPosts(posts);
    } else {
      // Deselect all
      props.setSelectedPosts([]);
    }
  };

  const selectAllChecked =
    props.selectedPosts.length === posts.length && posts.length > 0;
  const selectAllPartial =
    props.selectedPosts.length > 0 && props.selectedPosts.length < posts.length;

  const selectAllRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      (selectAllRef.current as any).indeterminate = selectAllPartial;
    }
  }, [selectAllPartial]);

  if (loading)
    return (
      <div className="w-full h-full flex justify-center text-xl">
        {" "}
        <Loader2 className="mr-2 h-10 w-10 animate-spin" />
      </div>
    );

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
          Select All ({props.selectedPosts.length} selected)
        </Label>
      </div>
      <div className="flex flex-col gap-3 w-full">
        {posts
          .filter((card) => card && card.mainId) // Filter out posts without an ID
          .map((card: PostType) => (
            <div
              key={card.mainId}
              className="flex items-center space-x-3 w-full"
            >
              <Checkbox
                className="border-2 border-[#E1E4EA]"
                id={card.mainId}
                checked={props.selectedPosts.some(
                  (p) => p.mainId === card.mainId
                )}
                onCheckedChange={() => toggleSelect(card)}
              />
              <Label
                htmlFor={card.mainId}
                className="cursor-pointer w-full"
                onClick={() => {
                  // setOpenPostSetting(true);
                  // setClickedPost(card);
                }}
              >
                <Post
                  postDetails={card}
                  posts={posts}
                  onRefresh={fetchPostsOfAnAgent}
                  // onOpenPostSetting={openPostSetting}
                  // setOpenPostSetting={setOpenPostSetting}
                  onEdit={() => handleEditClick(card)}
                />
              </Label>
            </div>
          ))}
      </div>
      {/*
       {ClickedPost && (
        <Dialog open={openPostSetting} onOpenChange={setOpenPostSetting}>
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />

            <div
              className="
            fixed left-0 right-0 bottom-0 
            w-screen 
            h-[calc(100vh-60px)] 
            bg-white 
            rounded-t-xl 
            shadow-lg 
            overflow-y-auto 
            z-50 
            animate-in 
            slide-in-from-bottom-10
          "
              style={{
                top: "50px", // start right below your header
              }}
            >
              <button
                onClick={() => setOpenPostSetting(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>

              <PostSetting post={ClickedPost} posts={posts} />
            </div>
          </DialogPortal>
        </Dialog>
      )} 
      */}
  <Dialog open={openPostSetting} onOpenChange={(open) => setOpenPostSetting(open)}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />
          <div className="fixed inset-0 w-screen h-screen bg-white rounded-t-xl shadow-lg overflow-y-auto z-50 animate-in slide-in-from-bottom-10">
            {/* Key the PostSetting by activePost.mainId to force remount on change */}
            {clickedPost ? (
              <PostSetting
                key={clickedPost.mainId}
                post={clickedPost}
                posts={posts}
                onClose={() => {
                  setOpenPostSetting(false);
                  // Refresh posts after close
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
