// src/app/(authenticated)/agents/create/components/ThirdStep.tsx
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Upload, FolderOpen, MoreVertical, X, Plus, ChevronDown, Edit } from "lucide-react";
import { FaInstagram, FaPlayCircle, FaYoutube } from "react-icons/fa";
import Image from "next/image";
import { useState, useRef, Dispatch, SetStateAction } from "react";
import api from "@/lib/axios"; 
import { CHANNEL_URL } from "@/lib/urls"; 
import { AccountType, PostType, CarouselPost } from "../types";
import PostSetting from "../../../postsetting/PostSetting";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import LibraryImportModal, { MediaItem } from "./LibraryImportModal"; 

// --- START: Corrected Helper function to get media type ---
const getMediaType = (mediaUrl: string | undefined, mediaType?: string): "video" | "image" | "gif" => {
  // 1. Check the explicit mediaType from metadata first (most reliable)
  if (mediaType) {
    if (mediaType.startsWith("video/")) return "video";
    if (mediaType.startsWith("image/gif")) return "gif";
    if (mediaType.startsWith("image/")) return "image";
  }

  // 2. Fallback to URL check if mediaType is not available
  if (!mediaUrl) return "image";
  const lower = mediaUrl.toLowerCase();

  // Check blob URL (less reliable, but good fallback for uploads)
  if (mediaUrl.startsWith("blob:")) {
    // This is an assumption, but often correct for file uploads
    return "video"; 
  }

  // Check by file extension (most reliable for existing URLs)
  const videoExtensions = [".mp4", ".mov", ".webm", ".avi", ".mkv", ".wmv", ".flv", ".f4v", ".3gp", ".m4v", ".mpeg", ".mpg", ".mts", ".m2ts", ".ogv", ".ts", ".vob", ".mxf"];
  if (videoExtensions.some(ext => lower.endsWith(ext))) { // Use endsWith for accuracy
    return "video";
  }
  if (lower.endsWith(".gif")) {
    return "gif";
  }
  
  return "image";
};
// --- END: Corrected Helper function ---

// --- Utility function to fetch presigned URL from file_key ---
async function fetchPresignedUrl(fileKey: string, expirationMinutes: number = 30): Promise<string> {
  try {
    const response = await api.get(CHANNEL_URL.S3_PRESIGNED_DOWNLOAD_URL, {
      params: {
        file_key: fileKey,
        expiration_minutes: expirationMinutes
      }
    });
    return response.data.download_url;
  } catch (error) {
    console.error("Failed to fetch presigned URL:", error);
    throw error;
  }
}


interface ThirdStepProps {
  posts: PostType[];
  setPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  selectedAccounts: AccountType[];
  carouselPosts: CarouselPost[];
  setCarouselPosts: React.Dispatch<React.SetStateAction<CarouselPost[]>>;
  agentType: string | null;
}

// --- HELPER FUNCTION TO CONVERT LIBRARY ITEM TO POSTTYPE ---
const mapMediaItemToPostType = (mediaItem: MediaItem, accounts: AccountType[]): PostType => {
  // Signed URL from backend for display
  const displayFileUrl = mediaItem.file_url;

  // Raw S3 key (for payloads, if needed)
  const rawFileKey = mediaItem.file_key || "";

  return {
    mainId: `lib-${mediaItem.id}-${Math.random().toString(36).substr(2, 9)}`,
    agent: "library-import",
    mediaUrl: displayFileUrl,
    fileKey: rawFileKey,
    size: mediaItem.file_size || 0,
    posts: accounts.map((account) => ({
      postId: `lib-post-${mediaItem.id}-${account.id}`,
      title: mediaItem.file_name || "Untitled from library",
      content:{},
      status: "uploaded",
      uploadProgress: 100,
      source: "library",
      platform: account,
      date: new Date(mediaItem.created_at || Date.now()).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      ),
      caption: [],
      metadata: { description: "", mediaType: mediaItem.file_type },
      tags: [],
      thumbnailUrl: displayFileUrl, 
      resize: "",
    })),
  };
};

// --- END HELPER FUNCTION ---

export default function ThirdStep({
  posts,
  setPosts,
  selectedAccounts,
  carouselPosts,
  setCarouselPosts,
  agentType
}: ThirdStepProps) {
  const [storeInLibrary, setStoreInLibrary] = useState(false);
  const [openPostSetting, setOpenPostSetting] = useState(false);
  const [clickedPost, setClickedPost] = useState<PostType | null>(null);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [currentTargetCarouselId, setCurrentTargetCarouselId] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };
// const handleCloseModal = () => {
//   // This triggers onOpenChange(false), so refresh will run there
//   setOpenPostSetting(false);
//   if (props.onRefresh) props.onRefresh();

// };

  // This function is for uploading *new* files to S3
  async function uploadFile(file: File): Promise<{ fileKey: string; presignedUrl: string }> {
    const formData = new FormData();
    formData.append("file", file);
    try {
        const response = await api.post(CHANNEL_URL.S3_FILE_UPLOAD, formData, { 
          headers: { "Content-Type": "multipart/form-data" },
        });
        const data = response.data;
        if (!data || !data.file_key) {
            throw new Error("file_key not found in upload response");
        }
        return {
          fileKey: data.file_key,
          presignedUrl: data.download_url || data.url || ""
        }; 
    } catch (error) {
         console.error("Upload API call failed:", error);
         throw error;
    }
  }

  // ----------------- REUSABLE UPLOADER COMPONENT (defined inline) -----------------
  interface ContentUploaderProps {
    onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onChooseFromLibrary: () => void;
    accept: string;
    title: string;
    description: string;
    uploadButtonText: string;
  }
  
  function ContentUploader({
    onFileSelect,
    onChooseFromLibrary,
    accept,
    title,
    description,
    uploadButtonText
  }: ContentUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    const handleUploadLocalClick = () => {
      fileInputRef.current?.click();
    };
//   const handleCloseModal = () => {
//   // This triggers onOpenChange(false), so refresh will run there
//   setOpenPostSetting(false);
//   if (props.onRefresh) props.onRefresh();

// };

    return (
      <div className="w-full border-2 border-dashed border-[#E5E5E5] rounded-2xl p-8 mb-6 bg-[#FAFAFA]">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <Upload className="h-12 w-12 text-[#5B5B64]" />
          </div>
          <h3 className="text-lg font-semibold leading-[100%] tracking-[-0.21px] mb-2 text-[#000001E3]">
            {title}
          </h3>
          <p className="text-sm font-normal leading-5 tracking-[-0.21px] mb-6 text-[#5B5B64]">
            {description}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={handleUploadLocalClick}
              className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-[#181818] font-medium px-6 py-3 rounded-xl flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {uploadButtonText}
            </Button>
            <Button
              onClick={onChooseFromLibrary} // <-- Use prop here
              variant="outline"
              className="bg-white border-[#E5E5E5] text-[#181818] font-medium px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-gray-50"
            >
              <FolderOpen className="h-4 w-4" />
              Choose from Library
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept} // Use the accept prop
            onChange={onFileSelect}
            className="hidden"
            onClick={(event) => { (event.target as HTMLInputElement).value = ''; }}
          />
        </div>
      </div>
    );
  }

  // ----------------- CAROUSEL POST ITEM COMPONENT -----------------
  interface CarouselPostItemProps {
    post: CarouselPost;
    onUpdate: (updatedPost: CarouselPost) => void;
    onRemove: (id: string) => void;
    onChooseFromLibrary: (carouselId: string) => void;
  }
  
  function CarouselPostItem({ post, onUpdate, onRemove, onChooseFromLibrary }: CarouselPostItemProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [name, setName] = useState(post.name);
  
    // Handler for local file upload *inside* this item
    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
  
      const newMediaItems: PostType[] = Array.from(files).map((file) => {
        const localUrl = URL.createObjectURL(file);
        
        return {
          mainId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          agent: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          mediaUrl: localUrl, // Local preview blob
          fileKey: undefined, // Will be set on upload
          size: file.size,
          posts: selectedAccounts.map((account) => ({
            postId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: file.name,
            status: 'uploading',
            uploadProgress: 0,
            source: "computer",
            platform: account,
            date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", }) + " • " + new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, }),
            caption: [],
            metadata: { descripiton:"",mediaType: file.type }, // 👈 MODIFIED: STORE THE FILE TYPE HERE
            tags: [],
            thumbnailUrl: localUrl, // Use localUrl for thumbnail preview
            resize: "",
            content:{}
          })),
        };
      });
  
      let updatedMedia = [...post.media, ...newMediaItems];
      onUpdate({ ...post, media: updatedMedia });
  
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const itemToUpdate = newMediaItems[i];
          const localUrl = itemToUpdate.mediaUrl;
          try {
              // **TASK 2 FIX**: Removed the image-only check
              const { fileKey, presignedUrl } = await uploadFile(file);
              
         updatedMedia = updatedMedia.map((m) =>
            m.mainId === itemToUpdate.mainId
              ? {
                  ...m,
                  fileKey, // Store the S3 file key
                  mediaUrl: presignedUrl, // Use presigned URL for display
                  posts: m.posts.map((inner) => ({ ...inner, mediaUrl: presignedUrl, thumbnailUrl: presignedUrl, status: "uploaded", uploadProgress: 100, })),
                }
              : m
          );
              onUpdate({ ...post, media: updatedMedia });
              URL.revokeObjectURL(localUrl); // Revoke blob URL after success
            
          } catch (error) {
              console.error("Upload failed for file:", file.name, error);
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              toast.error(`Upload failed for ${file.name}: ${errorMessage}`);
             updatedMedia = updatedMedia.map((m) =>
            m.mainId === itemToUpdate.mainId
              ? { ...m, posts: m.posts.map((inner) => ({ ...inner, status: "failed", })), }
              : m
          );
          onUpdate({ ...post, media: updatedMedia });
          URL.revokeObjectURL(localUrl); // Also revoke on failure
          }
      }
    };
  
  
    const handleRemoveMedia = (mediaId: string) => {
      // Revoke blob URL to prevent memory leaks if it's one
      const item = post.media.find(m => m.mainId === mediaId);
      if (item && item.mediaUrl.startsWith("blob:")) {
        URL.revokeObjectURL(item.mediaUrl);
      }
      onUpdate({ ...post, media: post.media.filter(m => m.mainId !== mediaId) });
    };
  
    const handleNameSubmit = (e?: React.FormEvent) => {
      e?.preventDefault();
      setIsEditingName(false);
      if (name !== post.name) {
        onUpdate({ ...post, name });
      }
    };
  
    return (
      <Collapsible defaultOpen className="w-full border border-[#E5E5E5] rounded-xl bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-[#E5E5E5]">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="w-5 h-5 mr-2 hover:bg-gray-100 rounded">
              <ChevronDown className="h-4 w-4 text-[#5B5B64]" />
            </Button>
          </CollapsibleTrigger>
  
          {isEditingName ? (
             <form onSubmit={handleNameSubmit} className="flex-1">
               <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleNameSubmit()}
                  autoFocus
                  className="text-sm font-medium h-8 border-gray-300 focus:border-yellow-400 focus:ring-yellow-400"
               />
             </form>
          ) : (
             <span className="text-sm font-medium flex-1 truncate cursor-text" onClick={() => setIsEditingName(true)}>
                 {post.name || "Untitled Carousel Post"}
             </span>
          )}
  
          <Button onClick={() => setIsEditingName(!isEditingName)} variant="ghost" size="icon" className="w-6 h-6 ml-2 hover:bg-gray-100 rounded">
              <Edit size={14} color="#5B5B64" />
          </Button>
          <Dialog>
               <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" className="w-6 h-6 hover:bg-red-50 rounded">
                       <X size={14} className="text-red-500" />
                   </Button>
              </DialogTrigger>
              <DialogContent>
                   <DialogHeader>
                       <DialogTitle>Remove Carousel Post</DialogTitle>
                       <DialogDescription>
                           Are you sure you want to remove "{post.name || 'this post'}" and all its images/videos?
                       </DialogDescription>
                   </DialogHeader>
                   <DialogFooter>
                       <Button variant="outline" onClick={() => {}}>Cancel</Button>
                       <Button onClick={() => onRemove(post.id)} className="bg-red-600 hover:bg-red-700">Remove</Button>
                   </DialogFooter>
              </DialogContent>
           </Dialog>
        </div>
  
        {/* Content */}
        <CollapsibleContent className="p-4 space-y-4">
          <ContentUploader
            onFileSelect={handleFileSelect}
            onChooseFromLibrary={() => onChooseFromLibrary(post.id)}
            accept="image/*,video/*" // **TASK 2 FIX**: Allow videos
            title="Add Images or Videos to this Post"
            description="Upload images or videos from your computer or choose from the library."
            uploadButtonText="Upload Media" // **TASK 2 FIX**: Changed text
          />
  
          {/* List of uploaded media for *this* post */}
          {post.media.map(item => {
            // **TASK 2 FIX**: Check if media is video
            const mediaType = getMediaType(item.mediaUrl, (item.posts[0].metadata as any)?.mediaType); // 👈 MODIFIED
            const isVideo = mediaType === 'video';
            return (
              <div key={item.mainId} className="w-full flex items-center gap-3 pl-7">
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {/* 👇 MODIFIED: This is the correct if/else structure 👇 */}
                  {isVideo ? (
                    <>
                      <video
                        src={item.mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <FaPlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-lg" />
                    </>
                  ) : (
                    <Image 
                      src={item.mediaUrl} 
                      alt={item.posts[0].title} 
                      width={48} 
                      height={48} 
                      className="w-full h-full object-cover"
                      unoptimized={mediaType === 'gif'}
                      onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate text-[#000001E3]">{item.posts[0]?.title || "Untitled"}</span>
                  {item.posts[0]?.status === "uploaded" ? (
                    <p className="text-xs text-[#5B5B64]">{item.posts[0]?.date || ""}</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#5B5B64]">{item.posts[0]?.status === 'failed' ? 'Upload Failed' : 'Uploading'}</span>
                      {item.posts[0]?.status !== 'failed' && <div className="w-16 h-1 bg-[#F5F5F5] rounded-full overflow-hidden"><div className="h-full bg-[#FDE047]" style={{ width: `${item.posts[0]?.uploadProgress || 0}%` }}></div></div>}
                    </div>
                  )}
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-[#F5F5F5] text-[#5B5B64]">{formatFileSize(item.size)}</span>
                <Button onClick={() => handleRemoveMedia(item.mainId)} variant="ghost" size="icon" className="w-5 h-5">
                    <X size={14} color="#5B5B64" />
                </Button>
              </div>
            );
          })}
                
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // ----------------- MAIN THIRD STEP COMPONENT -----------------
  const isCarousel = agentType === "create_carousel_or_slider";

  const handleOpenLibrary = (carouselId: string | null = null) => {
    setCurrentTargetCarouselId(carouselId);
    setIsLibraryModalOpen(true);
  };
  
  const handleImportFromLibrary = (selectedMedia: MediaItem[]) => {
    // mapMediaItemToPostType now handles adding the fileKey
    const newPosts = selectedMedia.map(item => mapMediaItemToPostType(item, selectedAccounts));

    if (currentTargetCarouselId) {
      // If we are adding to a specific carousel post
      setCarouselPosts(prev =>
        prev.map(carouselPost =>
          carouselPost.id === currentTargetCarouselId
            ? { ...carouselPost, media: [...carouselPost.media, ...newPosts] }
            : carouselPost
        )
      );
      const targetName = carouselPosts.find(p => p.id === currentTargetCarouselId)?.name || 'carousel';
      toast.success(`Added ${newPosts.length} item(s) to ${targetName}.`);
    } else {
      // We are adding to the main "posts" list (non-carousel)
      setPosts(prev => [...prev, ...newPosts]);
      toast.success(`Imported ${newPosts.length} item(s).`);
    }

    setIsLibraryModalOpen(false);
    setCurrentTargetCarouselId(null);
  };
  // --- END HANDLERS ---


  // --- CAROUSEL-SPECIFIC HANDLERS ---
  const handleAddCarouselPost = () => {
    const newPost: CarouselPost = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: `Carousel Post ${carouselPosts.length + 1}`,
      media: [],
    };
    setCarouselPosts(prev => [...prev, newPost]);
  };

  const handleUpdateCarouselPost = (updatedPost: CarouselPost) => {
    setCarouselPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handleRemoveCarouselPost = (id: string) => {
     setCarouselPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleRemoveAllCarouselPosts = () => {
    // Clean up blob URLs before removing
    carouselPosts.forEach(cp => {
      cp.media.forEach(item => {
        if (item.mediaUrl.startsWith("blob:")) {
          URL.revokeObjectURL(item.mediaUrl);
        }
      });
    });
    setCarouselPosts([]);
  };

  // --- ORIGINAL (FLAT LIST) HANDLERS ---
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPosts: PostType[] = Array.from(files).map((file) => ({
      mainId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      agent: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      mediaUrl: URL.createObjectURL(file), // 👈 local preview blob
      fileKey: undefined, // Will be added after upload
      size: file.size,
      posts: selectedAccounts.map((account) => ({
        postId: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title: file.name,
        status: 'uploading',
        uploadProgress: 0,
        source: "computer",
        platform: account,
        content:{},
        date:
          new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }) +
          " • " +
          new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        caption: [],
        metadata: { description:"", mediaType: file.type }, // 👈 MODIFIED: STORE THE FILE TYPE HERE
        tags: [],
        thumbnailUrl: URL.createObjectURL(file),
        resize: "",
      })),
    }));

    setPosts((prev) => [...prev, ...newPosts]);

    await Promise.all(
      newPosts.map(async (post, index) => {
        const file = files[index];
        const localUrl = post.mediaUrl; // Keep track of the blob URL
        try {
          const { fileKey, presignedUrl } = await uploadFile(file);

          setPosts((prev) =>
            prev.map((p) =>
              p.mainId === post.mainId
                ? {
                    ...p,
                    fileKey, // Store the S3 file key
                    mediaUrl: presignedUrl, // Use presigned URL for display
                    posts: p.posts.map((innerPost) => ({
                      ...innerPost,
                      mediaUrl: presignedUrl,
                      thumbnailUrl: presignedUrl,
                      status: "uploaded",
                      uploadProgress: 100,
                    })),
                  }
                : p
            )
          );
          URL.revokeObjectURL(localUrl); // Revoke the blob URL
        } catch (error) {
          console.error("Upload failed for file:", file.name, error);
          setPosts((prev) =>
            prev.map((p) =>
              p.mainId === post.mainId
                ? {
                    ...p,
                    posts: p.posts.map((innerPost) => ({
                      ...innerPost,
                      status: "failed",
                      uploadProgress: 0,
                    })),
                  }
                : p
            )
          );
          URL.revokeObjectURL(localUrl); // Also revoke on failure
        }
      })
    );
  };

  const handleRemovePost = (mainId: string) => {
    // Revoke blob URL to prevent memory leaks if it's one
    const item = posts.find(m => m.mainId === mainId);
    if (item && item.mediaUrl.startsWith("blob:")) {
      URL.revokeObjectURL(item.mediaUrl);
    }
    setPosts((prev) => prev.filter((post) => post.mainId !== mainId));
  };

  const handleRemoveAll = () => {
    // Revoke all blob URLs
    posts.forEach(post => {
      if (post.mediaUrl.startsWith("blob:")) {
        URL.revokeObjectURL(post.mediaUrl);
      }
    });
    setPosts([]);
  };

  // --- DYNAMIC CALCULATIONS ---
  const allMediaItems = isCarousel ? carouselPosts.flatMap(p => p.media) : posts;
  const totalSize = allMediaItems.reduce((total, item) => total + (item.size || 0), 0);

  // --- RENDER ---
  return (
    <>
      <LibraryImportModal
        open={isLibraryModalOpen}
        onOpenChange={setIsLibraryModalOpen}
        onImport={handleImportFromLibrary}
        isCarousel={isCarousel || currentTargetCarouselId != null}
      />

      {isCarousel ? (
        // ----------------- RENDER CAROUSEL UI -----------------
        <div className="w-full flex justify-center mt-12">
          <div className="max-w-3xl flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#000001E3]">
                Add Carousel Posts
              </h2>
              <Button onClick={handleAddCarouselPost} className="bg-[#FDE047] hover:bg-[#FDE047]/90 text-black">
                <Plus className="h-4 w-4 mr-2" />
                Add Post Section
              </Button>
            </div>

            <div className="w-full space-y-4">
              {carouselPosts.length === 0 && (
                  <p className="text-center text-gray-500 py-6">Click "Add Post Section" to create your first carousel post.</p>
              )}
              {carouselPosts.map(post => (
                  <CarouselPostItem
                    key={post.id}
                    post={post}
                    onUpdate={handleUpdateCarouselPost}
                    onRemove={handleRemoveCarouselPost}
                    onChooseFromLibrary={handleOpenLibrary}
                  />
              ))}
            </div>

            <div className="w-full flex justify-between items-center mt-8 mb-4 pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-[#5B5B64]">
                Store content on library?
              </span>
              <Switch
                checked={storeInLibrary}
                onCheckedChange={setStoreInLibrary}
                className="data-[state=checked]:bg-[#FDE047]"
              />
            </div>
            <div className="w-full flex justify-between items-center mb-4 text-sm">
              <div className="flex items-center gap-2 text-[#5B5B64]">
                <Upload className="h-4 w-4" />
                <span>
                  Total Size: {formatFileSize(totalSize)} / 250 MB
                </span>
              </div>
              {carouselPosts.length > 0 && (
                  <Dialog>
                  <DialogTrigger asChild>
                      <Button variant="ghost" className="text-red-600 hover:text-red-700 p-0 h-auto font-medium text-sm">
                      Remove All Sections
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader> <DialogTitle>Remove All Carousel Posts</DialogTitle> <DialogDescription> Are you sure you want to remove all post sections and their images/videos? This cannot be undone. </DialogDescription> </DialogHeader>
                      <DialogFooter> <Button variant="outline" onClick={() => {}}>Cancel</Button> <Button onClick={handleRemoveAllCarouselPosts} className="bg-red-600 hover:bg-red-700"> Remove All </Button> </DialogFooter>
                  </DialogContent>
                  </Dialog>
              )}
            </div>
          </div>
        </div>
      ) : (
        // ----------------- RENDER ORIGINAL (FLAT) UI -----------------
        <div className="w-full flex justify-center mt-12">
          <div className="max-w-3xl flex-1">
            <div className="mb-6">
              <h2 className="text-xl font-semibold leading-[100%] tracking-[-0.21px] text-[#000001E3]">
                Upload Content
              </h2>
            </div>
    
            <ContentUploader
              onFileSelect={handleFileSelect}
              onChooseFromLibrary={() => handleOpenLibrary(null)} // null target means add to main 'posts'
              accept="image/*,video/*"
              title="Post from My Computer or Library"
              description="Upload and share content directly from your device."
              uploadButtonText="Upload Local"
            />
    
            <div className="w-full flex justify-between items-center mb-6 mt-6 pt-4 border-t border-gray-100">
              <span className="text-sm font-medium text-[#5B5B64]">
                Store content on library?
              </span>
              <Switch
                checked={storeInLibrary}
                onCheckedChange={setStoreInLibrary}
                className="data-[state=checked]:bg-[#FDE047]"
              />
            </div>
    
            <div className="w-full flex justify-between items-center mb-4 text-sm">
              <div className="flex items-center gap-2 text-[#5B5B64]">
                <Upload className="h-4 w-4" />
                <span>
                  Total Size: {formatFileSize(totalSize)} / 250 MB
                </span>
              </div>
              {posts.length > 0 && (
                    <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" className="text-red-600 hover:text-red-700 p-0 h-auto font-medium text-sm">
                        Remove All Files
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Remove All Uploaded Files</DialogTitle><DialogDescription>Are you sure you want to remove all uploaded files? This cannot be undone.</DialogDescription></DialogHeader>
                        <DialogFooter><Button variant="outline" onClick={() => {}}>Cancel</Button><Button onClick={handleRemoveAll} className="bg-red-600 hover:bg-red-700">Remove All</Button></DialogFooter>
                    </DialogContent>
                    </Dialog>
              )}
            </div>
    
            <div className="w-full space-y-3">
              {posts.map((post) => {
                const mediaType = getMediaType(post.mediaUrl, (post.posts[0].metadata as any)?.mediaType); // 👈 MODIFIED: Pass mediaType
                const isVideo = mediaType === 'video';
    
                return (
                  <div
                    key={post.mainId}
                    onClick={() => {
                      setOpenPostSetting(true);
                      setClickedPost(post);
                    }}
                    className="w-full border border-[#E5E5E5] rounded-xl p-4 bg-white flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4 text-[#5B5B64] cursor-grab" />
    
                    <div className="relative w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {isVideo ? (
                        <>
                          <video
                            src={post.mediaUrl} // This is now a full URL or blob
                            className="w-full h-full object-cover"
                            controls={false}
                            muted
                            playsInline
                          />
                          <FaPlayCircle className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-lg" />
                        </>
                      ) : (
                        <Image
                          src={post.mediaUrl ? post.mediaUrl : "/placeholder-image.png"} 
                          alt="Preview"
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                          unoptimized={mediaType === 'gif'}
                          onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
                        />
                      )}
                    </div>
    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium leading-[100%] tracking-[-0.21px] truncate text-[#000001E3]">
                          {post.posts[0].title}
                        </span>
                        {post.posts[0].source === "instagram" && (
                          <FaInstagram className="h-3 w-3 text-pink-500" />
                        )}
                        {post.posts[0].source === "youtube" && (
                          <FaYoutube className="h-3 w-3 text-red-600" />
                        )}
                      </div>
                      {post.posts[0].status === "uploaded" ? (
                        <p className="text-xs font-normal leading-[100%] tracking-[-0.21px] text-[#5B5B64]">
                          {post.posts[0].date || ""}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal leading-[100%] tracking-[-0.21px] text-[#5B5B64]">
                            {post.posts[0].status === "failed"
                              ? "Upload Failed"
                              : "Uploading"}
                          </span>
                          {post.posts[0].status !== "failed" && (
                            <div className="w-16 h-1 bg-[#F5F5F5] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#FDE047] rounded-full transition-all duration-300"
                                style={{
                                  width: `${post.posts[0].uploadProgress || 0}%`,
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
    
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#F5F5F5] text-[#5B5B64]">
                        {formatFileSize(post.size)}
                      </span>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="w-5 h-5"
                           onClick={(e) => {
                             e.stopPropagation(); // Stop click from opening PostSetting
                           }}
                          >
                           <X className="h-4 w-4 text-[#5B5B64] cursor-pointer hover:text-[#181818]" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Post</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to remove "{post.posts[0].title}
                              "? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => {}}>Cancel</Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemovePost(post.mainId);
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                );
              })}
            </div>
    
            {/* {clickedPost && !isCarousel && (
              <Dialog open={openPostSetting} onOpenChange={setOpenPostSetting}>
                <DialogPortal>
                  <DialogOverlay className="fixed inset-0 bg-black/30 z-40" />
                  <div className="fixed left-0 right-0 bottom-0 w-screen h-[calc(100vh-60px)] bg-white rounded-t-xl shadow-lg overflow-y-auto z-50 animate-in slide-in-from-bottom-10" style={{ top: "60px" }}>
                    <button onClick={() => setOpenPostSetting(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black bg-white/50 rounded-full p-1 z-10">
                      <X className="w-5 h-5" />
                    </button>
                    {clickedPost.mediaUrl && 
                    <PostSetting
                      key={refreshKey}
                      post={clickedPost}
                      posts={props.posts}
                      onClose={handleCloseModal} 
                    />}
                  </div>
                </DialogPortal>
              </Dialog>
            )} */}
          </div>
        </div>
      )}
    </>
  );
}