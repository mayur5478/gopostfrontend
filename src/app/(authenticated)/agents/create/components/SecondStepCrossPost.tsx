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
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { SiGoogledrive, SiTiktok } from "react-icons/si";
import { AccountType, AgentSettings } from "../types";

interface SecondStepCrossPostProps {
  sourceAccount: AccountType | null;
  setSourceAccount: React.Dispatch<React.SetStateAction<AccountType | null>>;
  agentSettings: AgentSettings;
  setAgentSettings: React.Dispatch<React.SetStateAction<AgentSettings>>;
  selectedAccounts: AccountType[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<AccountType[]>>;
  accountsData: AccountType[];
  isAccountSelected: boolean;
  setIsAccountSelected: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function SecondStepCrossPost(props: SecondStepCrossPostProps) {
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
      } else {
        return [...prev, account];
      }
    });
  };

  const handleRemoveSelectedAccount = (account: AccountType) => {
    props.setSelectedAccounts((prev) => {
      const updated = prev.filter((acc) => acc.id !== account.id);
      props.setIsAccountSelected(updated.length > 0 && !!props.sourceAccount);
      return updated;
    });
  };

  const handleConfirmAccountSelection = () => {
    props.setSelectedAccounts(tempSelectedAccounts);
    props.setIsAccountSelected(tempSelectedAccounts.length > 0 && !!props.sourceAccount);
    setOpen(false);
  };

  const handleSourceAccountSelect = (account: AccountType) => {
    let newSource: AccountType | null = null;
    if (props.sourceAccount?.id === account.id) {
      newSource = null;
    } else {
      newSource = account;
      props.setSelectedAccounts(prev =>
        prev.filter(acc => acc.id !== account.id)
      );
    }
    props.setSourceAccount(newSource);
    props.setIsAccountSelected(props.selectedAccounts.length > 0 && !!newSource);
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
  }, [open, props.selectedAccounts]);

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
    if (platform == "google")
      return <SiGoogledrive className={className + "text-green-600"} />;
  };

  const mapPlatformNames = (platform: string) => {
    if (platform == "facebook") return "Facebook";
    if (platform == "instagram") return "Instagram";
    if (platform == "linkedin") return "LinkedIn";
    if (platform == "youtube") return "Youtube";
    if (platform == "tiktok") return "TikTok";
    if (platform == "google") return "Google Drive";
    return "";
  };

  const router = useRouter();

  const destinationAccountsData = props.accountsData.filter(
    acc => acc.id !== props.sourceAccount?.id
  );

  return (
    <>
      <div className="w-full flex justify-center mt-12 px-4 md:px-0">
        <div className="w-full max-w-4xl">

          {/* --- SOURCE ACCOUNT --- */}
          <div className="mb-10">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Select Source Account</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose the single account you want to pull posts from.
              </p>
            </div>

            {/* RESPONSIVE GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {props.accountsData.map((account) => {
                const isSelected = props.sourceAccount?.id === account.id;

                return (
                  <Button
                    key={account.id}
                    onClick={() => handleSourceAccountSelect(account)}
                    variant="ghost"
                    className={`border rounded-2xl p-4 flex flex-col items-start relative h-auto min-h-[90px] ${
                      isSelected
                        ? "border-2 border-[#FDE047]"
                        : "border-2 border-[#00001D14] hover:border-[#FDE047]/50"
                    }`}
                  >
                    <div className="w-full h-8 flex items-center mt-1">
                      <div className="w-6 h-6 rounded-lg border p-1 flex items-center justify-center">
                        {getIconElement(account.channel_type)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full text-left">
                      <div>{mapPlatformNames(account.channel_type)}</div>
                      <div className="text-xs text-[#5B5B64] truncate w-full">
                        {account.username}
                      </div>
                    </div>

                    <div className="absolute top-3 right-3">
                      <div
                        className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center ${
                          isSelected
                            ? "border-[#FDE047] bg-[#FDE047]"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} color="#181818" />}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* --- PUBLISH DESTINATIONS --- */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Publishing Destinations</h2>
          </div>

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
                  className="w-full rounded-2xl flex items-center justify-center gap-2 h-12 border-dashed"
                  disabled={!props.sourceAccount}
                >
                  <Plus className="h-4 w-4" /> Select Destinations
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-xl rounded-2xl w-[95vw]">
                <DialogHeader>
                  <DialogTitle>Select your publishing destinations</DialogTitle>
                  <DialogDescription>
                    Choose accounts where this content will be published.
                  </DialogDescription>
                </DialogHeader>

                {destinationAccountsData.length === 0 ? (
                  <h1 className="text-grey-500 text-center py-8">
                    No other accounts available.
                  </h1>
                ) : (
                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1">
                    {destinationAccountsData.map((account) => {
                      const isSelected =
                        props.selectedAccounts.some(a => a.id === account.id) ||
                        tempSelectedAccounts.some(a => a.id === account.id);

                      return (
                        <Button
                          key={account.id}
                          onClick={() => handleTemproryAccountSelect(account)}
                          variant="ghost"
                          className={`border rounded-2xl p-4 flex flex-col items-start relative h-auto ${
                            isSelected
                              ? "border-2 border-[#FDE047]"
                              : "border-2 border-[#00001D14] hover:border-[#FDE047]/50"
                          }`}
                        >
                          <div className="w-6 h-6 border rounded-lg p-1 flex items-center justify-center">
                            {getIconElement(account.channel_type)}
                          </div>

                          <div className="flex flex-col gap-1 mt-2 w-full text-left">
                            <div>{mapPlatformNames(account.channel_type)}</div>
                            <div className="text-xs text-[#5B5B64] truncate">
                              {account.username}
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="w-6 h-6 rounded-full border-[3px] bg-[#FDE047] border-[#FDE047] flex items-center justify-center">
                                <Check size={12} />
                              </div>
                            </div>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                )}

                <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-3 sm:gap-0">
                  <Button
                    variant="secondary"
                    className="bg-[#00000114] w-full sm:w-auto"
                    onClick={() => router.push(`/connections`)}
                  >
                    <Plus className="h-4 w-4" /> Add new connection
                  </Button>

                  <Button variant="default" onClick={handleConfirmAccountSelection} className="w-full sm:w-auto">
                    Confirm
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* SELECTED DESTINATIONS */}
          {props.selectedAccounts.length > 0 && (
            <div className="border border-[#FDE047] rounded-lg mb-8 bg-[#FDE047]/5">
              {props.selectedAccounts.map((account) => (
                <div className="flex justify-between items-center p-3 border-b border-[#FDE047]/20 last:border-0" key={account.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border rounded-lg p-1 flex items-center justify-center bg-white">
                      {getIconElement(account.channel_type)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{mapPlatformNames(account.channel_type)}</span>
                        <span className="text-xs text-gray-500">{account.username}</span>
                    </div>
                  </div>

                  <button
                    className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                    onClick={() => handleRemoveSelectedAccount(account)}
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}