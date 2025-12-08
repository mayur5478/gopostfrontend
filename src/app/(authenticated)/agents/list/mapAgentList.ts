import { AgentData, DestinationPlatform, Settings } from "./types";

export default function mapAgentList(apiAgentData
    : any): AgentData {
    let allConnections = apiAgentData.agent_connections.map((connections: any) => connections.connection)
    const deplatforms = allConnections.filter((entity: any) => entity.status === "active")

    return {
      id: apiAgentData.agent_id,
      name: apiAgentData.name,
      type: apiAgentData.type,
      status: apiAgentData.status,
      source: apiAgentData.source,
      destinationPlatforms: deplatforms,
      settings: {
        autoFetch: apiAgentData.auto_fetch,
        autoApproveMetaData: apiAgentData.auto_approve_metadata,
        autoResize: apiAgentData.auto_resize,
        aiCaptions: apiAgentData.ai_captions,
        smartSchedule: apiAgentData.smart_schedule,
        autoCreateMetaData: apiAgentData.auto_create_metadata
      },
      createdAt :apiAgentData.created_at,
      updatedAt: apiAgentData.updated_at
    }

  }