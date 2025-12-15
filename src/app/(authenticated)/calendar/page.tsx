"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Instagram, 
  Music2, 
  Video,
  Youtube,
  Linkedin,
  HardDrive,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';

const CalendarUI = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Ensure this URL points to your actual backend port (usually 8000 for Django)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/agents/calendar/events/?start=${startStr}&end=${endStr}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`, 
            'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      
      const formattedEvents = data.map((item: any) => ({
        id: item.id, // This is the post_id
        title: item.title,
        date: item.date,
        platform: item.platform?.toLowerCase() || 'unknown',
        agent_id: item.agent_id, 
        status: item.status,
        time: item.date ? format(parseISO(item.date), 'h:mm a') : 'All Day'
      }));

      setEvents(formattedEvents);
    } catch (err) {
      console.error("Calendar Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  
  const getEventsForDay = (date: Date) => {
    return events.filter((event: any) => {
      const eventDate = typeof event.date === 'string' ? parseISO(event.date) : event.date;
      return isSameDay(eventDate, date);
    });
  };

  // --- UPDATED NAVIGATION LOGIC ---
  const handleGoToPost = (agentId: string, postId: string) => {
    if (agentId) {
        // 1. Point to the correct file path found in your project
        // 2. Add focusPost param so ViewAgentClient switches to the Scheduled tab
        router.push(`/agents/view/${agentId}/agent?focusPost=${postId}`); 
    }
  };

  const PlatformIcon = ({ platform, className }: { platform: string, className?: string }) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return <Instagram className={clsx("text-pink-600", className)} />;
    if (p.includes('tiktok')) return <Music2 className={clsx("text-black", className)} />;
    if (p.includes('youtube')) return <Youtube className={clsx("text-red-600", className)} />;
    if (p.includes('linkedin')) return <Linkedin className={clsx("text-blue-700", className)} />;
    if (p.includes('google') || p.includes('drive')) return <HardDrive className={clsx("text-green-600", className)} />;
    return <Video className={clsx("text-gray-400", className)} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agent</h1>
          <p className="text-gray-500 text-sm">Create, schedule, and manage your content in one place.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#FDE047] hover:bg-yellow-400 text-black font-medium px-4 py-2 rounded-full transition-colors">
          <Plus size={18} />
          Create Agent
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {['Month', 'Week', 'Today'].map((v) => (
            <button key={v} className="px-4 py-1.5 text-sm font-medium rounded-md text-gray-500 hover:text-gray-700">
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold min-w-[150px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-full border border-gray-200">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-full border border-gray-200">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        
        <div className="w-[180px] flex justify-end pr-4">
            {loading && <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="animate-spin" size={16}/> Syncing...</div>}
        </div> 
      </div>

      <div className="flex gap-6">
        
        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-7 mb-4">
            {weekDays.map(day => (
              <div key={day} className="text-gray-500 font-medium text-sm pl-2">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 grid-rows-5 gap-4 h-[600px]">
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const hasEvents = dayEvents.length > 0;

              return (
                <div 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    "relative border rounded-xl p-2 flex flex-col justify-between transition-all cursor-pointer hover:border-blue-400 overflow-hidden",
                    isCurrentMonth ? "bg-white border-gray-100" : "bg-gray-50 border-gray-50 text-gray-400",
                    isSelected && "ring-2 ring-blue-500 border-transparent"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={clsx("text-sm font-medium", !isCurrentMonth && "text-gray-300")}>
                      {format(day, 'd')}
                    </span>
                    {hasEvents && isCurrentMonth && (
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 overflow-y-auto scrollbar-hide">
                    <div className="flex gap-1 flex-wrap content-end">
                      {dayEvents.slice(0, 6).map((evt: any, i: number) => (
                        <PlatformIcon key={i} platform={evt.platform} className="w-4 h-4" />
                      ))}
                      {dayEvents.length > 6 && <span className="text-[10px] text-gray-400">+{dayEvents.length - 6}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Details */}
        <div className="w-[350px] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col h-[700px]">
          <h2 className="text-xl font-bold border-b-2 border-yellow-400 pb-2 inline-block w-fit mb-6">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h2>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 flex-1 overflow-y-auto">
            <h3 className="font-semibold text-gray-700 mb-4 sticky top-0 bg-gray-50">Today's Events</h3>
            
            <div className="space-y-6">
              {loading && events.length === 0 ? (
                <div className="text-center py-4"><Loader2 className="animate-spin mx-auto text-gray-400"/></div>
              ) : getEventsForDay(selectedDate).length > 0 ? (
                getEventsForDay(selectedDate).map((evt: any) => (
                  <div key={evt.id} className="relative group bg-white rounded-lg p-3 border border-gray-100 hover:shadow-md transition-all">
                    
                    <div className="flex items-start gap-3">
                      <div className={clsx("mt-1.5 w-2 h-2 rounded-full shrink-0", 
                        evt.status === 'published' ? "bg-green-500" : "bg-yellow-400"
                      )} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-bold text-gray-800">{evt.time}</p>
                          <PlatformIcon platform={evt.platform} className="w-3.5 h-3.5" />
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-2" title={evt.title}>
                           {evt.title || "Untitled Post"}
                        </p>

                        <div className="flex justify-between items-center">
                           <span className={clsx("text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-medium", 
                             evt.status === 'published' ? "bg-green-100 text-green-700" : 
                             evt.status === 'scheduled' ? "bg-blue-100 text-blue-700" :
                             "bg-gray-100 text-gray-500"
                           )}>
                             {evt.status || 'Draft'}
                           </span>

                           {evt.agent_id && (
                             <button 
                               onClick={() => handleGoToPost(evt.agent_id, evt.id)} // Pass agentID and postID
                               className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                             >
                               View Post <ArrowRight size={10} />
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                    <p className="text-sm text-gray-400 italic">No events scheduled.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CalendarUI;