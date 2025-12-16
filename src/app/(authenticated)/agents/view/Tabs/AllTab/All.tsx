"use client";
import React from "react";
import { AgentData } from "../../../list/types";
import { PostType, CarouselPostDetails } from "../../../create/types";
import CarouselAll from "./CarouselAll";
import AllPostFromComp from "./AllPostFromComp";
import CrossPostAll from "./CrossPostAll";

type Props = {
  AgentData: AgentData;
  selectedPosts: PostType[];
  selectedCPosts: CarouselPostDetails[];
  setSelectedPosts: React.Dispatch<React.SetStateAction<PostType[]>>;
  setSelectedCPosts: React.Dispatch<
    React.SetStateAction<CarouselPostDetails[]>
  >;
  refreshKey: number;
  onRefresh: () => void;
};

export default function All(props: Props) {
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

      case "cross_post":
        return (
          <CrossPostAll
            refreshKey={props.refreshKey}
            AgentData={props.AgentData}
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

  return <>{renderContent()}</>;
}
