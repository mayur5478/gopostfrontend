export interface PostType {
 mainId: string,
  agent:string,
  mediaUrl:string, // Presigned URL for display (temporary, will be fetched when needed)
  fileKey?: string; // S3 file key (required for S3 storage) - e.g., "uploads/user_2/uuid_filename.png"
  size:number,
  posts :Channel_Posts[];

}
export type Channel_Posts={
  postId: string;
  title:string,
  caption:string[];
  tags:string[];
  status: 'published' | 'uploading' | 'failed' | 'pending' | 'scheduled' | 'uploaded' |'approved' ;
  source: string;
  scheduleTime?: string;
  uploadProgress?: number;
  date:string;
  thumbnailUrl:string;
  mediaUrl?:string,
  resize:"square" | "vertical" | "horizontal"| "";
  metadata:{ description?: string; mediaType:string;}
  platform: AccountType;
  content:any;
}


export interface CarouselPost {
  id: string; // Unique ID for the collapsible section
  name: string; // Name of this specific carousel post
  media: PostType[]; // Array of media items (images/videos) within this carousel
}

export type CarouselPostDetails = {
  mainId: string; // ID of the MasterPost
  firstMediaUrl: string; // The primary media_url (first image)
  agent:string;
  posts:channel_posts_carousel[]}

export  type channel_posts_carousel ={
  postId: string;       // ID of the representative Post within channel_posts
  allMediaUrls: string[];// All URLs from metadata.media_urls
  title: string;
  caption: string[];      // caption from representative post
  channelId: number | string | null; // Store the channel ID for schedule patching
  tags:string[];
  status: 'published' | 'uploading' | 'failed' | 'pending' | 'scheduled' | 'uploaded' ;
  source: string;
  scheduleTime?: string;
  uploadProgress?: number;
  date:string;
  thumbnailUrl:string;
  resize:"square" | "vertical" | "horizontal" | "";
  metadata:{ description?: string; mediaType:string;}
  platform: AccountType;
  content:any;
};

export type AgentSettings = {
  "Auto Create Meta Data": boolean;
  "Auto Approve Meta Data": boolean;
  "Auto-Resize": boolean;
  "AI Captions": boolean;
  "Smart Schedule": boolean;
  "Auto-Fetch": boolean;
};

// Assuming AccountType is defined correctly elsewhere or here:
export type AccountType = {
  id: number; // Or string if UUID
  channel_type: string;
  created_at: string;
  updated_at: string;
  status: boolean; // Or string like 'active'
  username: string;
  user: number; // Or string if UUID
  // Add any other relevant fields, e.g., connection_id if different from id
};


// --- ADD THIS NEW EXPORT ---
export interface SourcePost {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string;
  description?: string; // Full description/caption
  hashtags?: string[]; // Array of hashtags
  created_at: string;
  type: "video" | "image" | "carousel" | "text";
  platform: string;
}