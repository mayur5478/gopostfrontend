// export type DestinationPlatform = {
//   connectionId: string,
//   platform: string,
//   account_name: string,
//   auth_token: string,
//   status: string,
//   createdAt: string,
//   updatedAt: string
// };

import { AccountType } from "../create/types";

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
  destinationPlatforms: AccountType[],
  settings: Settings,
  createdAt: string,
  updatedAt: string
};
