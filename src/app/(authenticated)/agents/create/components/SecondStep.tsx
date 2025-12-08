"use client";

import { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import Image from "next/image";
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { SiGoogledrive, SiTiktok } from "react-icons/si";

type SecondStepProps = {
  agentSettings: AgentSettings;
  setAgentSettings: React.Dispatch<React.SetStateAction<AgentSettings>>;
  selectedAccounts: AccountType[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<AccountType[]>>;
  accountsData: AccountType[];
  isAccountSelected: boolean;
  setIsAccountSelected: React.Dispatch<React.SetStateAction<boolean>>;
};
type AgentSettings = {
  "Auto Create Meta Data": boolean;
  "Auto Approve Meta Data": boolean;
  "Auto-Resize": boolean;
  "AI Captions": boolean;
  "Smart Schedule": boolean;
  "Auto-Fetch": boolean;
};

type AccountType = {
  id: number;
  channel_type: string;
  created_at: string;
  updated_at: string;
  status: boolean;
  username: string;
  user: number;
};

export default function SecondStep(props: SecondStepProps) {
  const [open, setOpen] = useState(false);
  const [tempSelectedAccounts, setTempSelectedAccounts] = useState<
    AccountType[]
  >([]);

  function settingChanged(setting: keyof AgentSettings) {
    props.setAgentSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  }

  const handleTemproryAccountSelect = (account: AccountType) => {
    setTempSelectedAccounts((prev) => {
      if (prev.some((a) => a.id === account.id)) {
        return prev.filter((a) => a.id !== account.id);
      } else if (props.selectedAccounts.some((a) => a.id === account.id)) {
        return prev.filter((a) => a.id !== account.id);
      } else {
        return [...prev, account];
      }
    });
  };

  const handleRemoveSelectedAccount = (account: AccountType) => {
    props.setSelectedAccounts((prev) => {
      const updated = prev.filter((acc) => acc.id !== account.id);
      props.setIsAccountSelected(updated.length > 0);
      return updated;
    });
  };

  const handleConfirmAccountSelection = () => {
    props.setSelectedAccounts(tempSelectedAccounts);
    props.setIsAccountSelected(tempSelectedAccounts.length > 0);
    setOpen(false);
  };

  const handleModalClose = () => {
    setTempSelectedAccounts([]);
  };

  useEffect(() => {
    if (!open) {
      setTempSelectedAccounts([]);
    } else {
      setTempSelectedAccounts(props.selectedAccounts || []);
    }
  }, [open]);

  const getIconElement = (platform: string) => {
    let className = "h-full w-full ";
    if (platform == "facebook")
      return <FaFacebook className={className + "text-blue-600"} />;
    if (platform == "instagram")
      return <FaInstagram className={className + "text-pink-500"} />;
    if (platform == "linkedin")
      return <FaLinkedin className={className + "text-blue-600"} />;
    if (platform == "youtube")
      return <FaYoutube className={className + "text-red-600"} />;
    if (platform == "tiktok")
      return <SiTiktok className={className + "text-[#EE1D52]"} />;
    // FIXED: Typo was "goggle"
    if (platform == "google")
      return <SiGoogledrive className={className + "text-green-600"} />;
  };

  const mapPlatformNames = (platform: string) => {
    if (platform == "facebook") return "Facebook";
    if (platform == "instagram") return "Instagram";
    if (platform == "linkedin") return "LinkedIn";
    if (platform == "youtube") return "Youtube";
    if (platform == "tiktok") return "TikTok";
    // FIXED: Typo was "goggle"
    if (platform == "google") return "Google Drive";
    return "";
  };

  const router = useRouter();

  return (
    <>
      <div className="w-full flex justify-center mt-12">
        <div className="max-w-[80%] w-full">
          {/* Title */}
          <div className="mb-4">
            <h2
              className="text-xl font-semibold leading-[100%] tracking-[-0.21px]"
              style={{ color: "#000001E3" }}
            >
              Publishing To
            </h2>
          </div>

          {/* Select Account Button */}
          <div className="w-full mb-5 ">
            <Dialog
              open={open}
              onOpenChange={(isOpen) => {
                setOpen(isOpen);
                if (!isOpen) handleModalClose();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full rounded-2xl flex items-center justify-center gap-2"
                >
                  <Plus className="mr-0.6 h-4 w-4" /> Select Account
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-l font-semibold leading-[100%] tracking-[-0.21px]">
                    Select your publishing to account
                  </DialogTitle>
                  <DialogDescription>
                    Choose the account where your content will be published.
                  </DialogDescription>
                </DialogHeader>

                {props.accountsData.length == 0 ? (
                  <div className=" flex flex-col w-full h-full items-center justify-center">
                    <h1 className="text-grey-500">
                      No Accounts Linked! click on Add new connection to add
                      accounts
                    </h1>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-2 gap-6">
                    {props.accountsData.map((account) => {
                      const isSelected =
                        props.selectedAccounts.some(
                          (a) => a.id === account.id
                        ) ||
                        tempSelectedAccounts.some((a) => a.id === account.id);
                      return (
                        <Button
                          key={account.id}
                          onClick={() => handleTemproryAccountSelect(account)}
                          variant="ghost"
                          className={`border border-gray-200 cursor-pointer text-left rounded-2xl p-4 gap-2 flex flex-col !items-start !justify-start relative transition-all duration-200 hover:shadow-md w-full h-auto ${
                            isSelected
                              ? "border-2 border-[#FDE047]"
                              : "border-2 border-[#00001D14] hover:border-[#FDE047]/50"
                          }`}
                        >
                          <div className="w-full h-8 flex items-center mt-1">
                            <div className="w-6 h-6 rounded-lg border border-[#5B5B641A] p-1 hover:bg-gray-50 flex items-center justify-center">
                              {getIconElement(account.channel_type)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div>{mapPlatformNames(account.channel_type)}</div>
                            <div className="text-xs font-normal leading-[100%] text-[#5B5B64]">
                              {account.username}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="w-6 h-6 rounded-full border-[3px] border-[#FDE047] bg-[#FDE047] flex items-center justify-center">
                                <Check
                                  size={12}
                                  color="#181818"
                                  strokeWidth={2.12}
                                />
                              </div>
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}

                <DialogFooter className="flex w-full items-center !justify-between !flex-row">
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2 bg-[#00000114]"
                    onClick={() => {
                      router.push(`/connections`);
                    }}
                  >
                    <Plus className="h-4 w-4" /> Add new connection
                  </Button>

                  <Button
                    variant="default"
                    className="px-6 py-3"
                    onClick={handleConfirmAccountSelection}
                  >
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Selected Accounts */}
          {props.selectedAccounts.length > 0 && (
            <div className="border border-[#FDE047] rounded-s  mb-3">
              {props.selectedAccounts.map((account) => {
                return (
                  <div className="flex justify-between p-1.5" key={account.id}>
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-lg border border-[#5B5B641A] p-1 hover:bg-gray-50 flex items-center justify-center">
                        {getIconElement(account.channel_type)}
                      </div>
                      <div className="text-s font-normal leading-[100%] text-[#5B5B64]">
                        {account.username}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => {
                        handleRemoveSelectedAccount(account);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                    >
                      <X size={16} className="text-gray-700" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------- Configure Agent Settings (COMMENTED OUT) ---------- */}

          {/*
          <div className="w-full mb-4">
            <h4 className="text-l font-semibold leading-[100%] tracking-[-0.21px]">
              Configure Agent Settings
            </h4>
          </div> */}
{/* 
          <div className="w-full grid grid-cols-3 gap-8">
            {(Object.entries(props.agentSettings) as [
              keyof AgentSettings,
              boolean
            ][]).map(([key, value]) => {
              return (
                <div
                  key={key}
                  className="flex justify-between items-center gap-2"
                >
                  <Label htmlFor={key}>{key}</Label>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={() => settingChanged(key)}
                    className="data-[state=checked]:bg-[#FDE047]"
                  />
                </div>
              );
            })}
          </div>
          */}

        </div>
      </div>
    </>
  );
}