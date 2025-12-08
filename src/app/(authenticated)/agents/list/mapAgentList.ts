import { AccountType } from "../create/types";
import { AgentData, Settings } from "./types";

export default function mapAgentList(apiAgentData: any, channels: AccountType[]): AgentData {

  // Ensure unique values
  const uniqueIds = Array.from(new Set(apiAgentData.channel_ids));

  const destinationAccounts: AccountType[] = channels.filter((ch) =>
    uniqueIds.includes(ch.id)
  );
  let source="local";
  if(apiAgentData.source!="local"){
    source = channels.find((ch) =>
    ch.id == apiAgentData.source
  )?.channel_type ||"";
  }

  return {
    id: apiAgentData.agent_id,
    name: apiAgentData.name,
    type: apiAgentData.type,
    status: apiAgentData.status,
    source: source,
    destinationPlatforms: destinationAccounts,
    settings: {
      autoFetch: apiAgentData.auto_fetch,
      autoApproveMetaData: apiAgentData.auto_approve_metadata,
      autoResize: apiAgentData.auto_resize,
      aiCaptions: apiAgentData.ai_captions,
      smartSchedule: apiAgentData.smart_schedule,
      autoCreateMetaData: apiAgentData.auto_create_metadata,
    },
    createdAt: apiAgentData.created_at,
    updatedAt: apiAgentData.updated_at,
  };
}
