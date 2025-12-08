// src/lib/urls.ts

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PATHS = {
  AUTH: "",
  AGENTS: "agents/agents",
  WORKSPACES: "agents/workspaces",
  CHANNEL: "channels/",
  AI: "scheduler/smart/",
  MEDIA_ENGINE: "media/",
} as const;

const createUrl = (path: string): string => `${BASE_URL}/${path}`;

// ... (baki interfaces jaise AuthUrls, AgentUrls, etc.) ...
interface AuthUrls {
  LOGIN: string;
  SIGNUP: string;
}

interface AgentUrls {
  DETAIL: (id: string) => string;
  POSTS: (id: string) => string;
  GET_AGENTS: string;
  CREATE_AGENT: string;
  VIEW_AGENT: (id: string) => string;
  PATCH_POST: (agentId: string, postId: string) => string;
  CAROUSEL_POSTS: (id: string) => string;
  CROSS_POST: (id: string) => string;
}

interface ChannelUrls {
  GET_CHANNEL: string;
  S3_FILE_UPLOAD: string;
  S3_PRESIGNED_DOWNLOAD_URL: string;
  REMOTE_FILES: string;
  GET_CHANNEL_POSTS: (channelId: string | number) => string;
  MEDIA_LIBRARY: string;
  MEDIA_LIBRARY_DETAIL: (id: string | number) => string;
}

interface WorkspaceUrls {
  GET_WORKSPACES: (userId: string) => string;
  CREATE_WORKSPACE: string;
  UPDATE_WORKSPACE: (workspaceId: string) => string;
  DELETE_WORKSPACE: (workspaceId: string) => string;
}


interface MediaEngineUrls {
  CAPTIONS: string;
  HASHTAGS: string;
  RESIZE_MEDIA: string;
  RESIZE_IMAGE:string;
  THUMBNAIL: string;
  AI_THUMBNAIL: string;
  TRANSCRIBE: string; // <-- ADD THIS
  PROCESS_PIPELINE:string;
  SMART_SCHEDULE: string;
  ANALYZE_MEDIA_URL: string;
}

const URLS = {
  // ... (baki URLs jaise AUTH, AGENTS, etc.) ...
  BACKEND_URL: BASE_URL,
  AUTH: {
    LOGIN: createUrl(`${PATHS.AUTH}login/`),
    SIGNUP: createUrl(`${PATHS.AUTH}signup/`),
  } as AuthUrls,
  AGENTS: {
    DETAIL: (id: string) => createUrl(`${PATHS.AGENTS}/${id}`),
    POSTS: (id: string) => createUrl(`${PATHS.AGENTS}/${id}/posts/`),
    GET_AGENTS: createUrl(`${PATHS.AGENTS}/`),
    CREATE_AGENT: createUrl(`${PATHS.AGENTS}/create/`),
    VIEW_AGENT: (id: string) => createUrl(`${PATHS.AGENTS}/${id}/`),
    PATCH_POST: (agentId: string, postId: string) =>
      createUrl(`${PATHS.AGENTS}/${agentId}/posts/${postId}/`),
    CAROUSEL_POSTS: (id: string) =>
      createUrl(`${PATHS.AGENTS}/${id}/carousel-posts/`),
    CROSS_POST: (id: string) => createUrl(`${PATHS.AGENTS}/${id}/cross-post/`),
  } as AgentUrls,
  CHANNELS: {
    GET_CHANNEL: createUrl(`${PATHS.CHANNEL}`),
    S3_FILE_UPLOAD: createUrl(`${PATHS.CHANNEL}file-upload-s3`),
    S3_PRESIGNED_DOWNLOAD_URL: createUrl(
      `${PATHS.CHANNEL}file-download-signed-url-s3`
    ),
    REMOTE_FILES: createUrl(`${PATHS.CHANNEL}remote-files`),
    GET_CHANNEL_POSTS: (channelId: string | number) =>
      createUrl(`${PATHS.CHANNEL}${channelId}/source-posts/`),
    MEDIA_LIBRARY: createUrl(`${PATHS.CHANNEL}media-library`),
   MEDIA_LIBRARY_DETAIL: (id: string | number) =>
     createUrl(`${PATHS.CHANNEL}media-library/${id}`),
  } as ChannelUrls,
  WORKSPACES: {
    GET_WORKSPACES: (userId: string) =>
      createUrl(`${PATHS.WORKSPACES}/?user_id=${userId}`),
    CREATE_WORKSPACE: createUrl(`${PATHS.WORKSPACES}/create/`),
    UPDATE_WORKSPACE: (workspaceId: string) =>
      createUrl(`${PATHS.WORKSPACES}/${workspaceId}/`),
    DELETE_WORKSPACE: (workspaceId: string) =>
      createUrl(`${PATHS.WORKSPACES}/${workspaceId}/`),
  } as WorkspaceUrls,

  MEDIA_ENGINE: {
    CAPTIONS: createUrl(`${PATHS.MEDIA_ENGINE}captions/`),
    HASHTAGS: createUrl(`${PATHS.MEDIA_ENGINE}hashtags/`),
    RESIZE_MEDIA: createUrl(`${PATHS.MEDIA_ENGINE}resize/`),
    RESIZE_IMAGE: createUrl(`${PATHS.MEDIA_ENGINE}resize-image/`),
    THUMBNAIL: createUrl(`${PATHS.MEDIA_ENGINE}thumbnail/`),
    AI_THUMBNAIL: createUrl(`${PATHS.MEDIA_ENGINE}ai-thumbnail/`),
    TRANSCRIBE: createUrl(`${PATHS.MEDIA_ENGINE}transcribe/`), // <-- ADD THIS
    PROCESS_PIPELINE: createUrl(`${PATHS.MEDIA_ENGINE}process-pipeline/`),
    SMART_SCHEDULE: createUrl(`${PATHS.AI}`),
    ANALYZE_MEDIA_URL: createUrl(`${PATHS.MEDIA_ENGINE}analyze-media-url/`),

  } as MediaEngineUrls,
};

export const AUTH_URLS = URLS.AUTH;
export const AGENT_URLS = URLS.AGENTS;
export const WORKSPACE_URLS = URLS.WORKSPACES;
export const CHANNEL_URL = URLS.CHANNELS;
export const MEDIA_ENGINE_URLS = URLS.MEDIA_ENGINE;
export default URLS;