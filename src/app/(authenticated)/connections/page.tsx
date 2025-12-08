"use client";

import api from "@/lib/axios";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Check, Plus, MoreVertical } from "lucide-react";
import Image from "next/image";
import { FaFacebook, FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";
import { SiGoogledrive, SiTiktok } from "react-icons/si";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import goLogo from "../../../../public/GoLogo.svg";

type Connection = {
  id: number;
  channel_type: string;
  created_at: string;
  updated_at: string;
  status: boolean;
  username: string;
  user: number;
};

// ❌ not configured yet
const disabledPlatforms = ["facebook", "instagram", "tiktok"];

// ✅ test users allowed for Google / YouTube
const googleTestUsers = [
  "inspirea.design@gmail.com",
  "lunawatmayur8@gmail.com",
  "ravikm896@gmail.com",
  "samruddhinaik178@gmail.com",
  "sujeetsg1372@gmail.com",
  "vedangkoolkarni@gmail.com",
];

export default function connection() {
  const [channels, setChannels] = useState<Connection[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("channels/");
        console.log("connect response:", response.data);
        if (response.data.count > 0) {
          setChannels(response.data.results);
        }
      } catch (error) {
        console.error("Error connecting:", error);
      }
    };

    fetchData();
  }, []);

  const allPlatforms = [
    "facebook",
    "instagram",
    "linkedin",
    "youtube",
    "tiktok",
    "google",
  ];

  const handleConnectionClick = (connection: Connection) => {};
  const handlePlatformClick = () => {};

  const handleConnectionClickClick = async (platform: string) => {
    platform = platform.toLowerCase();
    try {
      const { data: authData } = await api.get("channels/auth-url/", {
        params: { channel_type: platform },
      });
      let authUrl = authData.auth_url;
      console.log("Auth redirect URL:", authUrl);
      const separator = authUrl.includes("?") ? "&" : "?";
      authUrl = `${authUrl}${separator}channel_type=${encodeURIComponent(
        platform
      )}`;

      console.log("Redirecting to:", authUrl);
      window.open(authUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error(`Error connecting with  ${platform}:`, error);
    }
  };

  const getIconElement = (platform: string) => {
    const cplatform: string = platform;
    const className = "h-full w-full ";
    if (cplatform === "facebook")
      return <FaFacebook className={className + "text-blue-600"} />;
    if (cplatform === "instagram")
      return <FaInstagram className={className + "text-pink-500"} />;
    if (cplatform === "linkedin")
      return <FaLinkedin className={className + "text-blue-600"} />;
    if (cplatform === "youtube")
      return <FaYoutube className={className + "text-red-600"} />;
    if (cplatform === "tiktok")
      return <SiTiktok className={className + "text-[#EE1D52]"} />;
    if (cplatform === "google")
      return <SiGoogledrive className={className + "text-green-600"} />;
  };

  const mapPlatformNames = (platform: string) => {
    if (platform === "facebook") return "Facebook";
    if (platform === "instagram") return "Instagram";
    if (platform === "linkedin") return "LinkedIn";
    if (platform === "youtube") return "Youtube";
    if (platform === "tiktok") return "TikTok";
    if (platform === "goggle_drive") return "Google Drive";
    return "";
  };

  const [open, setOpen] = useState(false);
  const [openPlatformConnection, setOpenPlatformConnection] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  return (
    <>
      <div className="w-full pt-3 pr-6 pb-3 pl-3 items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-2.5 w-full border-b border-gray-200 pt-3 pr-6 pb-3 pl-3">
          <div className="flex flex-col gap-2 w-fit h-fit">
            <div className="inline-block font-semibold text-[20px] leading-[100%] tracking-[-0.21px]">
              Connections
            </div>
            <div className="Users inline-flex gap-2 justify-start">
              <span>
                One place to link, control, and grow every social account.
              </span>
            </div>
          </div>
          <div className="ml-auto p-2.5 flex items-center justify-center w-fit">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="bg-[#FDE047] rounded-2xl flex items-center gap-2"
                >
                  <Plus className="mr-0.6 h-4 w-4" /> Add Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-l font-semibold leading-[100%] tracking-[-0.21px]">
                    Add a new connection
                  </DialogTitle>
                </DialogHeader>

                <div className="w-full grid grid-cols-3 gap-4 mt-8">
                  {allPlatforms.map((platform) => {
                    return (
                      <Button
                        key={platform}
                        onClick={() => handlePlatformClick()}
                        variant="ghost"
                        className="border border-gray-200 text-left rounded-2xl p-4 gap-5 flex flex-col !items-start !justify-start relative transition-all duration-200 hover:shadow-md w-full h-auto"
                      >
                        <div className="w-full h-8 flex items-center justify-between mt-1">
                          <div className="w-8 h-8 gap-2.5 rounded-lg border border-[#5B5B641A] p-1 hover:bg-gray-50 flex items-center justify-center">
                            {getIconElement(platform)}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <div>{platform}</div>
                          <div className="text-xs font-normal leading-[100%] text-[#5B5B64]">
                            Source/Destination
                          </div>
                        </div>

                        <div
                          className="absolute bottom-4 right-4 "
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlatform(platform);
                            setOpenPlatformConnection(true);
                          }}
                        >
                          <div className="w-6 h-6 cursor-pointer rounded-full border-[3px] border-[#FDE047] bg-[#FDE047] flex items-center justify-center">
                            <Plus size={8} color="#181818" strokeWidth={2} />
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>

                {selectedPlatform && (
                  <Dialog
                    open={openPlatformConnection}
                    onOpenChange={setOpenPlatformConnection}
                  >
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {`Connect ${selectedPlatform}`}
                        </DialogTitle>
                      </DialogHeader>

                      {/* BODY OF MODAL – different for each platform */}
                      {disabledPlatforms.includes(selectedPlatform!) ? (
                        <div className="text-center py-4">
                          <p className="text-red-500 text-sm font-medium">
                            {selectedPlatform} connection is currently disabled.
                          </p>
                          <p className="text-gray-600 text-sm mt-2">
                            We cannot connect this platform because a developer
                            account and OAuth secret keys are not configured
                            yet.
                          </p>
                        </div>
                      ) : selectedPlatform === "google" ||
                        selectedPlatform === "youtube" ? (
                        <div className="text-center py-4">
                          <p className="text-blue-600 text-sm font-medium">
                            Only approved test users can connect to{" "}
                            {selectedPlatform}.
                          </p>
                          <p className="text-gray-600 text-sm mt-2">
                            If your email is not in the test user list below,
                            please ask the admin to add your email in Google
                            Cloud Console and then try again.
                          </p>
                          <ul className="mt-3 text-xs text-gray-700 bg-gray-100 rounded-lg p-3">
                            {googleTestUsers.map((email) => (
                              <li
                                key={email}
                                className="py-1 border-b last:border-none"
                              >
                                {email}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="w-full flex justify-center items-center mt-4">
                          <div className="w-[50%] h-14 flex items-center justify-between mt-1">
                            <div className="w-12 h-12 gap-2.5 rounded-lg border border-[#5B5B641A] p-2 hover:bg-gray-50 flex items-center justify-center">
                              <Image src={goLogo} alt="gopost logo" />
                            </div>
                            <ArrowRightLeft className="w-10 h-10 text-blue-500 animate-pulse" />
                            <div className="w-12 h-12 gap-2.5 rounded-lg border border-[#5B5B641A] p-1 hover:bg-gray-50 flex items-center justify-center">
                              {getIconElement(selectedPlatform)}
                            </div>
                          </div>
                        </div>
                      )}

                      <DialogFooter>
                        <Button
                          onClick={() => {
                            setOpenPlatformConnection(false);
                            setSelectedPlatform(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          disabled={disabledPlatforms.includes(selectedPlatform!)}
                          className={
                            disabledPlatforms.includes(selectedPlatform!)
                              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                              : ""
                          }
                          onClick={() => {
                            if (!disabledPlatforms.includes(selectedPlatform!)) {
                              handleConnectionClickClick(
                                selectedPlatform as string
                              );
                            }
                          }}
                        >
                          {disabledPlatforms.includes(selectedPlatform!)
                            ? "Not Available"
                            : "Connect"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {channels.length > 0 ? (
          <div className="w-full grid grid-cols-4 gap-6 mt-8">
            {channels.map((connection: Connection) => {
              return (
                <Button
                  key={connection.id}
                  onClick={() => handleConnectionClick(connection)}
                  variant="ghost"
                  className="border border-gray-200 cursor-pointer text-left rounded-2xl p-4 gap-5 flex flex-col !items-start !justify-start relative transition-all duration-200 hover:shadow-md w-full h-auto"
                >
                  <div className="w-full h-8 flex items-center justify-between mt-1">
                    <div className="w-6 h-6 gap-2.5 rounded-lg border border-[#5B5B641A] p-1 hover:bg-gray-50 flex items-center justify-center">
                      {getIconElement(connection.channel_type)}
                    </div>
                    <div className="w-8 h-8 gap-2.5 rounded-full border border-black/6 p-2.5 flex items-center justify-center">
                      <MoreVertical size={24} color="#5B5B64" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div>{mapPlatformNames(connection.channel_type)}</div>
                    <div className="text-xs font-normal leading-[100%] text-[#5B5B64]">
                      {connection.username}
                    </div>
                  </div>

                  {connection && (
                    <div className="absolute bottom-4 right-4">
                      <div className="w-4 h-4 rounded-full border-[3px] border-[#00C950] bg-[#00C950] flex items-center justify-center">
                        <Check size={4} color="#FFFFFF" strokeWidth={1.8} />
                      </div>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 pb-8 flex flex-col w-full h-full items-center justify-center">
            <h1>
              Click on Add Connection button to set up your first Connection
            </h1>
          </div>
        )}
      </div>
    </>
  );
}
