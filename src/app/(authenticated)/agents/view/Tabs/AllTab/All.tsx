// src/app/(authenticated)/agents/view/Tabs/AllTab/All.tsx

"use client";
import React from "react";
import { AgentData } from "../../../list/types";
import { PostType, CarouselPostDetails } from "../../../create/types";
import CarouselAll from "./CarouselAll";
import AllPostFromComp from "./AllPostFromComp";
import CrossPostAll from "./CrossPostAll"; // Import the new component

type Props = {
  AgentData: AgentData;
  selectedPosts: PostType[];
  selectedCPosts: CarouselPostDetails[];
  // You might need a specific state for selectedCrossPosts if the type differs, 
  // otherwise reuse selectedPosts if the structure is the same.
  setSelectedPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  setSelectedCPosts: React.Dispatch<React.SetStateAction<CarouselPostDetails[]>>;
  refreshKey: number;
  onRefresh: () => void; 
};

export default function All(props: Props) {
  
  // Logic to determine which view to show
  const renderContent = () => {
    switch (props.AgentData.type) {
      case "create_carousel_or_slider":
        return (
          <CarouselAll
            key={props.refreshKey}
            refreshKey={props.refreshKey}
            AgentData={props.AgentData}
            selectedCPosts={props.selectedCPosts}
            setSelectedCPosts={props.setSelectedCPosts}
            onRefresh={props.onRefresh}
          />
        );
      
      // Add your Cross Post Condition here
      case "cross_post": 
      // OR whatever your backend string is for this agent type
        return (
          <CrossPostAll
            refreshKey={props.refreshKey}
            AgentData={props.AgentData}
            // Assuming CrossPosts share the PostType structure:
            selectedCrossPosts={props.selectedPosts} 
            setSelectedCrossPosts={props.setSelectedPosts}
          />
        );

      default:
        return (
          <AllPostFromComp
            refreshKey={props.refreshKey}
            AgentData={props.AgentData}
            selectedPosts={props.selectedPosts}
            setSelectedPosts={props.setSelectedPosts}
            onRefresh={props.onRefresh}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}
    </>
  );
}