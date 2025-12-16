"use client";

import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaPlayCircle,
  FaGoogleDrive,
} from "react-icons/fa";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Metadata from "./postSettingTabs/Metadata";
import Captions from "./postSettingTabs/Captions";
import Thumbnail from "./postSettingTabs/Thumbnail";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { PostType } from "../agents/create/types";
import PreviewPanel from "./PreviewPanel";
import api from "@/lib/axios";
import { AGENT_URLS, CHANNEL_URL } from "@/lib/urls";
import toast from "react-hot-toast";

type Props = {
  post: PostType;
  posts: PostType[];
  onClose: () => void;
};

type AspectRatio = "square" | "vertical" | "horizontal";



async function fetchPresignedUrl(
  fileKey: string,
  expirationMinutes: number = 60
): Promise<string> {
  if (!fileKey || !fileKey.startsWith("uploads/")) return fileKey;
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: { file_key: fileKey, expiration_minutes: expirationMinutes },
    });
    return response.data.download_url;
  } catch (error) {
    console.error("Error fetching signed URL:", error);
    return fileKey;
  }
}

const getMediaType = (post: PostType | undefined): boolean => {
  if (!post) return false;
  // 1. Check Metadata for S3 Key
  const s3Key = (post.posts[0]?.metadata as any)?.s3_media_key;
  if (s3Key) {
      const lowerKey = s3Key.toLowerCase();
      if (lowerKey.endsWith(".mp4") || lowerKey.endsWith(".mov") || lowerKey.endsWith(".avi") || lowerKey.endsWith(".mkv") || lowerKey.endsWith(".webm")) {
          return true; 
      }
  }
  // 2. Check explicit mediaType
  const metaType = (post.posts[0]?.metadata as any)?.mediaType;
  if (metaType && metaType.startsWith("video")) return true;

  // 3. Fallback: Check URL
  const url = post.mediaUrl || "";
  const lower = url.toLowerCase();
  const videoExtensions = [".mp4", ".mov", ".ts", ".avi", ".mkv", ".mpeg", ".wmv", ".flv", ".f4v", ".3gp", ".m4v", ".m2ts", ".mpg", ".ogv", ".webm", ".vob", ".mxf", ".mts"];
  
  if (videoExtensions.some((ext) => lower.includes(ext))) return true;
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return true;
  return false;
};

export default function CrossPostSetting({ post, posts, onClose }: Props) {
  const platforms = post.posts.map((p: any) => ({
    id: p.platform.id,
    name: p.platform.channel_type.charAt(0).toUpperCase() + p.platform.channel_type.slice(1),
    channel: p.platform.channel_type,
    icon:
      p.platform.channel_type === "facebook" ? FaFacebook :
      p.platform.channel_type === "linkedin" ? FaLinkedin :
      p.platform.channel_type === "youtube" ? FaYoutube :
      p.platform.channel_type === "google" ? FaGoogleDrive : null,
  }));

  const [selectedPost, setSelectedPost] = useState<PostType>(post);
  const [allPosts] = useState<PostType[]>(posts);

  // Preview State
  const [ratios, setRatios] = useState<Record<string, AspectRatio>>(
    Object.fromEntries(platforms.map((p: any) => [p.channel, "square"]))
  );
  const [resizedAspect, setResizedAspect] = useState<Record<AspectRatio, string>>({ square: "", vertical: "", horizontal: "" });
  const [resizedThumbnails, setResizedThumbnails] = useState<Record<string, string>>({});
  const [updatedMedia, setUpdatedMedia] = useState<Record<string, string>>({});

  const [selectedPlatform, setSelectedPlatform] = useState<string>(platforms[0]?.channel || "linkedin");

  const isVideo = getMediaType(selectedPost);

  // Form State
  const [metadataTitle, setMetadataTitle] = useState<Record<string, string>>({});
  const [metadataDesc, setMetadataDesc] = useState<Record<string, string>>({});
  const [hashtags, setHashtags] = useState<Record<string, string[]>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Record<string, any[]>>({});
  const [metadataContent, setMetadataContent] = useState<{
    title: string;
    description: string;
    tags: string[];
  }>({ title: "", description: "", tags: [] });

  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const generatedPostsRef = useRef<Set<string>>(new Set());

  // 1. Initialize Data & Resolve URLs
  useEffect(() => {
    if (!selectedPost) return;

    const initialize = async () => {
        // Resolve Signed URLs if needed
        let resolvedMediaUrl = selectedPost.mediaUrl;
        let resolvedThumbnailUrl = selectedPost.posts[0]?.thumbnailUrl || null;

        if (resolvedMediaUrl?.startsWith("uploads/")) {
            resolvedMediaUrl = await fetchPresignedUrl(resolvedMediaUrl);
        }
        if (resolvedThumbnailUrl?.startsWith("uploads/")) {
            resolvedThumbnailUrl = await fetchPresignedUrl(resolvedThumbnailUrl);
        }

        // Update selectedPost with resolved URLs locally for preview
        const updatedPostWithUrls = {
            ...selectedPost,
            mediaUrl: resolvedMediaUrl,
            posts: selectedPost.posts.map(p => ({
                ...p,
                mediaUrl: resolvedMediaUrl,
                thumbnailUrl: resolvedThumbnailUrl || p.thumbnailUrl
            }))
        };
        // Update local state only if URLs changed to avoid loops (simple check)
        if (resolvedMediaUrl !== selectedPost.mediaUrl) {
            setSelectedPost(updatedPostWithUrls);
        }

        const newTitles: Record<string, string> = {};
        const newDescs: Record<string, string> = {};
        const newTags: Record<string, string[]> = {};
        const newResizedThumbnails: Record<string, string> = {};

        selectedPost.posts.forEach((p) => {
          const key = p.platform?.channel_type?.toLowerCase();
          if (!key) return;

          newTitles[key] = p.title || (p.content as any)?.title || "";
          newDescs[key] = (p.content as any)?.description || (p.metadata?.description as string) || "";
          newTags[key] = (p.content as any)?.hashtags || (p.tags as string[]) || [];
          
          if (resolvedThumbnailUrl) {
              newResizedThumbnails[key] = resolvedThumbnailUrl;
          }
        });

        const firstKey = Object.keys(newTitles)[0];
        if (firstKey) {
            newTitles["content"] = newTitles[firstKey];
            newDescs["content"] = newDescs[firstKey];
            newTags["content"] = newTags[firstKey];
        }

        setMetadataTitle(newTitles);
        setMetadataDesc(newDescs);
        setHashtags(newTags);
        if (resolvedThumbnailUrl) {
            setThumbnail(resolvedThumbnailUrl);
            setResizedThumbnails(newResizedThumbnails);
        }
        
        setMetadataContent({
            title: newTitles["content"] || "",
            description: newDescs["content"] || "",
            tags: newTags["content"] || []
        });
    };

    initialize();
  }, [post.mainId]); // Only re-run if the prop post ID changes

  // 2. AUTO GENERATE
  useEffect(() => {
    const autoGenerateContent = async () => {
      if (!selectedPost || !selectedPost.agent) return;
      const postId = selectedPost.posts[0]?.postId;
      if (!postId) return;

      if (generatedPostsRef.current.has(postId)) return;

      const existingDesc =
        (selectedPost as any).content?.description ||
        (selectedPost.posts[0]?.content as any)?.description || 
        (selectedPost.posts[0]?.metadata as any)?.description;
      
      if (existingDesc && existingDesc.length > 5) return;

      setIsAnalyzing(true);
      generatedPostsRef.current.add(postId);

      try {
        const response = await api.post(AGENT_URLS.GENERATE_POST_METADATA(selectedPost.agent, postId));
        const data = response.data;
        const content = data.content || {};

        const genTitle = content.title || data.title || "";
        const genDesc = content.description || "";
        const genTags = content.hashtags || [];

        const platformKeys = ["content", ...platforms.map((p: any) => p.channel.toLowerCase())];

        setMetadataTitle((prev) => { const n = { ...prev }; platformKeys.forEach((k) => (n[k] = genTitle)); return n; });
        setMetadataDesc((prev) => { const n = { ...prev }; platformKeys.forEach((k) => (n[k] = genDesc)); return n; });
        setHashtags((prev) => { const n = { ...prev }; platformKeys.forEach((k) => (n[k] = genTags)); return n; });
        setMetadataContent({ title: genTitle, description: genDesc, tags: genTags });

        if (data.thumbnail_url) {
            // Resolve if S3 key returned by generator
            let thumb = data.thumbnail_url;
            if (thumb.startsWith("uploads/")) {
                thumb = await fetchPresignedUrl(thumb);
            }
            setThumbnail(thumb);
            setResizedThumbnails(prev => {
                const n = { ...prev };
                platformKeys.forEach(k => n[k] = thumb);
                return n;
            });
        }

        toast.success("Content Auto-Filled by AI!");
      } catch (e: any) {
        console.error(e);
        const errorMsg = e.response?.data?.error || e.message || "Auto-generation failed.";
        toast.error(errorMsg);
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (selectedPost) {
      const t = setTimeout(autoGenerateContent, 500);
      return () => clearTimeout(t);
    }
  }, [selectedPost]);

  // 3. Save Handler
  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const payload = {
        id: selectedPost.mainId,
        agent: selectedPost.agent,
        channel_posts: selectedPost.posts.map((p) => {
          const key = p.platform?.channel_type?.toLowerCase() || "";
          const ratio = ratios[key];

          return {
            post_id: p.postId,
            channel: p.platform?.id ?? null,
            title: metadataTitle[key] || "",
            metadata: {
              ...p.metadata,
              description: metadataDesc[key] || "",
            },
            content: {
                title: metadataTitle[key] || "",
                description: metadataDesc[key] || "",
                hashtags: hashtags[key] || []
            },
            tags: hashtags[key] || [],
            caption: captions[key] || [],
            thumbnail_url: resizedThumbnails[key] || thumbnail,
            resize: ratio,
            media_url: resizedAspect[ratio] || updatedMedia[key] || p.mediaUrl,
          };
        }),
      };

      await api.patch(AGENT_URLS.PATCH_POST(selectedPost.agent, selectedPost.mainId), payload);
      toast.success("Saved!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update post.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="w-full pt-1 pr-6 pb-3 pl-3 items-center justify-between">
        <div className="flex items-center gap-1 w-full border-b border-gray-200 pt-1 pr-6 pb-1 pl-3">
          <div className="flex flex-col gap-2 w-fit h-fit">
            <div className="inline-block font-semibold text-[18px] leading-[100%] tracking-[-0.21px]">
              Cross Post Settings
            </div>
          </div>
          <div className="ml-auto p-1 flex items-center justify-center w-fit">
            <Button variant="outline" className="text-gray-700 rounded-2xl mr-3" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" disabled={isSaving} onClick={handleSaveChanges} className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black rounded-2xl gap-2 px-4">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose} className="w-8 h-8 rounded-full">
            <X className="w-10 h-10 text-black" />
          </Button>
        </div>

        <div className="p-4 w-full">
          {/* Media Strip */}
          <div className="p-1 gap-2 flex flex-wrap">
            {[selectedPost, ...allPosts.filter((p) => p.mainId !== selectedPost.mainId)].map((p) => {
              const isVideoItem = getMediaType(p);
              const isSelected = p.mainId === selectedPost.mainId;
              
              // Prefer thumbnail for the strip preview (faster/cleaner)
              const previewSrc = (p.posts[0]?.thumbnailUrl && !p.posts[0].thumbnailUrl.startsWith('uploads/')) 
                  ? p.posts[0].thumbnailUrl 
                  : (p.mediaUrl?.startsWith('uploads/') ? null : p.mediaUrl);

              return (
                <div
                  key={p.mainId}
                  onClick={() => setSelectedPost(p)}
                  className={`relative w-[56px] h-[56px] rounded-md flex items-center justify-center cursor-pointer transition-all ${
                    isSelected ? "border-2 border-[#FDE047]" : "border border-gray-200 hover:border-[#FDE047]/70"
                  }`}
                >
                  <div className="relative w-[50px] h-[50px] rounded-md overflow-hidden bg-gray-100">
                    {isVideoItem ? (
                      <>
                        {previewSrc ? (
                            <Image src={previewSrc} alt="Preview" width={50} height={50} className="object-cover w-full h-full opacity-90" />
                        ) : (
                            <video src={p.mediaUrl || ""} className="object-cover w-full h-full opacity-70" />
                        )}
                        <FaPlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg z-10" />
                      </>
                    ) : (
                      <Image src={p.mediaUrl || "/placeholder.png"} alt="Preview" width={50} height={50} className="object-cover w-full h-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-6">
            {/* Tabs */}
            <div className="w-1/2">
              <Tabs defaultValue="Metadata">
                <TabsList>
                  <TabsTrigger value="Metadata">Metadata</TabsTrigger>
                  {isVideo && <TabsTrigger value="Thumbnail">Thumbnail</TabsTrigger>}
                  {isVideo && <TabsTrigger value="Captions">Captions</TabsTrigger>}
                </TabsList>
                <div className="mt-4">
                  <TabsContent value="Metadata">
                    <Metadata
                      post={selectedPost}
                      metadataTitle={metadataTitle}
                      setMetadataTitle={setMetadataTitle}
                      metadataDesc={metadataDesc}
                      setMetadataDesc={setMetadataDesc}
                      hashtags={hashtags}
                      setHashtags={setHashtags}
                      metadataContent={metadataContent}
                      setMetadataContent={setMetadataContent}
                      prompts={prompts}
                      setPrompts={setPrompts}
                    />
                  </TabsContent>

                  <TabsContent value="Thumbnail">
                    <Thumbnail
                      thumbnail={thumbnail}
                      setThumbnail={setThumbnail}
                      ratios={ratios}
                      resizedThumbnails={resizedThumbnails}
                      setResizedThumbnails={setResizedThumbnails}
                      selectedPost={selectedPost}
                      setSelectedPost={setSelectedPost}
                      selectedPlatform={selectedPlatform}
                      autoPrompt={prompts["content"]}
                    />
                  </TabsContent>

                  <TabsContent value="Captions">
                    <Captions
                      captions={captions}
                      setCaptions={setCaptions}
                      selectedPost={selectedPost}
                      setSelectedPost={setSelectedPost}
                      resizedAspect={resizedAspect}
                      setResizedAspect={setResizedAspect}
                      ratios={ratios}
                      setRatios={setRatios}
                      selectedPlatform={selectedPlatform}
                      setSelectedPlatform={setSelectedPlatform}
                      updatedMedia={updatedMedia}
                      setUpdatedMedia={setUpdatedMedia}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Preview Panel */}
            <PreviewPanel
              key={selectedPost.mainId}
              post={selectedPost}
              ratios={ratios}
              setRatios={setRatios}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              resizedAspect={resizedAspect}
              setResizedAspect={setResizedAspect}
              updatedMedia={updatedMedia}
              setUpdatedMedia={setUpdatedMedia}
              isCarousel={false}
            />
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm text-center border border-gray-100">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#FDE047] blur-xl opacity-30 rounded-full animate-pulse" />
              <Loader2 className="w-12 h-12 animate-spin text-[#FDE047] relative z-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Content</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Generating title, description, and hashtags from your source media...</p>
            <div className="mt-6 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-[#FDE047] w-full origin-left animate-progress" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}