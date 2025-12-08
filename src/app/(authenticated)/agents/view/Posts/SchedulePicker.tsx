"use client";

import { useState, useEffect } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface SchedulePickerProps {
  defaultDate?: string; // ISO string from API
  onConfirm: (scheduledAt: string) => void; // ISO string
  manualDate: string;
  manualTime: string;
  setManualDate: React.Dispatch<React.SetStateAction<string>>;
  setManualTime: React.Dispatch<React.SetStateAction<string>>;
}

export function SchedulePicker({
  defaultDate,
  onConfirm,
  manualDate,
  manualTime,
  setManualDate,
  setManualTime,
}: SchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);

  // Ensure defaultDate populates date/time correctly
  useEffect(() => {
    if (!defaultDate) return;
    const dateObj = new Date(defaultDate);
    if (!isNaN(dateObj.getTime())) {
      setManualDate(dateObj.toISOString().split("T")[0]);
      setManualTime(dateObj.toTimeString().slice(0, 5)); // HH:mm
    }
  }, [defaultDate, setManualDate, setManualTime]);

  const handleConfirm = () => {
    if (!manualDate || !manualTime) return;

    const [hours, minutes] = manualTime.split(":").map(Number);
    const combined = new Date(manualDate);
    combined.setHours(hours, minutes, 0, 0);

    setSelected(combined);
    onConfirm(combined.toISOString()); // send API-ready ISO string
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          className="flex items-center gap-2 rounded-xl bg-[#F5F5F5] hover:bg-[#E5E5E5] text-sm font-medium"
        >
          <CalendarClock className="h-4 w-4 text-[#333]" />
          Schedule
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-4 flex flex-col gap-4 rounded-xl border border-gray-200 shadow-md bg-white">
        {/* Date */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Select Date</label>
          <Input
            type="date"
            value={manualDate}
            onChange={(e) => setManualDate(e.target.value)}
            className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Time */}
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Select Time</label>
          <Input
            type="time"
            value={manualTime}
            onChange={(e) => setManualTime(e.target.value)}
            className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Confirm */}
        <Button
          onClick={handleConfirm}
          className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-sm rounded-lg py-2"
        >
          Confirm
        </Button>

        {/* Preview */}
        {selected && (
          <div className="text-xs text-gray-500 text-center">
            Selected: {format(selected, "MMM d, yyyy - h:mm a")}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
