import { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { UseFormSetValue } from "react-hook-form";
import Image from "next/image";
import { Check } from "lucide-react";

type FirstStepProps = {
  selectedAgentType: string | null;
  setSelectedAgentType: Dispatch<SetStateAction<string | null>>;
  agentTypes: AgentType[];
  setValue: UseFormSetValue<any>;
};

type AgentType = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export default function FirstStep(props: FirstStepProps) {
  const handleAgentTypeSelect = (typeId: string) => {
    props.setSelectedAgentType(typeId);
    props.setValue("agentType", typeId);
  };

  return (
    <div className="w-full flex justify-center mt-8">
      <div className="w-full max-w-5xl px-4 md:px-0">
        {/* Title */}
        <div className="mb-4">
          <h2
            className="text-lg md:text-xl font-semibold leading-[100%] tracking-[-0.21px]"
            style={{ color: "#000001E3" }}
          >
            Choose agent type
          </h2>
        </div>

        {/* Cards Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {props.agentTypes.map((agentType) => {
            const isSelected = props.selectedAgentType === agentType.id;

            return (
              <Button
                key={agentType.id}
                onClick={() => handleAgentTypeSelect(agentType.id)}
                variant="ghost"
                className={`cursor-pointer text-left rounded-2xl p-4 sm:p-5 gap-4 flex !items-start !justify-start relative transition-all duration-200 hover:shadow-md w-full h-auto
                  ${
                    isSelected
                      ? "border-2 border-[#FDE047]"
                      : "border-2 border-[#00001D14] hover:border-[#FDE047]/50"
                  }`}
              >
                <div className="w-9 h-9 flex items-center justify-center mt-1 flex-shrink-0 rounded-lg bg-gray-50">
                  <Image
                    src={agentType.icon}
                    alt={agentType.title}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>

                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <h3
                    className="text-sm sm:text-base font-semibold leading-[100%] tracking-[-0.21px] truncate"
                    style={{ color: "#000001E3" }}
                    title={agentType.title}
                  >
                    {agentType.title}
                  </h3>
                  <p
                    className="text-xs sm:text-sm font-normal leading-5 tracking-[-0.21px] text-ellipsis whitespace-normal break-words"
                    style={{ color: "#5B5B64" }}
                  >
                    {agentType.description}
                  </p>
                </div>

                {/* Tickmark at top right */}
                {isSelected && (
                  <div className="absolute -top-3 -right-3">
                    <div className="w-6 h-6 rounded-full border-[3px] border-[#FDE047] bg-[#FDE047] flex items-center justify-center">
                      <Check size={12} color="#181818" strokeWidth={2.12} />
                    </div>
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
