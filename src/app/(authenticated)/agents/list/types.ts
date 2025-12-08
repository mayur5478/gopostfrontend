export type DestinationPlatform = {
  connectionId: string,
  platform: string,
  account_name: string,
  auth_token: string,
  status: string,
  createdAt: string,
  updatedAt: string
};

export type Settings = {
  autoFetch: boolean,
  autoCreateMetaData: boolean,
  autoApproveMetaData: boolean,
  autoResize: boolean,
  aiCaptions: boolean,
  smartSchedule: boolean
};

export type AgentData = {
  id: string,
  name: string,
  status: string,
  type: string,
  source: string,
  destinationPlatforms: DestinationPlatform[],
  settings: Settings,
  createdAt: string,
  updatedAt: string
};
