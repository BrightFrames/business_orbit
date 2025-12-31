"use client";

import Modal from "react-modal";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import toast, { Toaster } from "react-hot-toast";


// Sample data for demonstration - will be replaced with API data
const upcomingEvents = [
  {
    id: 1,
    title: "AI in Product Development Workshop",
    host: "Sarah Chen",
    hostAvatar: "SC",
    date: "Dec 28, 2024",
    time: "6:00 PM - 8:00 PM",
    location: "WeWork BKC, Mumbai",
    attendees: 47,
    maxAttendees: 60,
    price: "Free",
    category: "Workshop",
    description: "Learn how to integrate AI into your product development process",
    eventType: "physical",
    meetingLink: "",
    isJoined: false,
  },
  {
    id: 2,
    title: "Startup Pitch Night",
    host: "Bengaluru Entrepreneurs",
    hostAvatar: "BE",
    date: "Jan 5, 2025",
    time: "7:00 PM - 9:00 PM",
    location: "91springboard Koramangala",
    attendees: 89,
    maxAttendees: 100,
    price: "₹500",
    category: "Networking",
    description: "Present your startup idea to investors and fellow entrepreneurs",
    eventType: "online",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    isJoined: false,
  },
];

export default function EventsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showRSVPDialog, setShowRSVPDialog] = useState(false);
  const [events, setEvents] = useState(upcomingEvents);
  const [hostingEvents, setHostingEvents] = useState<any[]>([]);

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proposalData, setProposalData] = useState({
    name: "",
    email: "",
    phone: "",
    eventTitle: "",
    eventDate: "",
    mode: "Online",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  // Set the app element for react-modal
  useEffect(() => {
    Modal.setAppElement(document.body);
  }, []);

  // Fetch hosting events
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchHostingEvents = async () => {
      try {
        console.log(`[Frontend] Fetching hosting events for user ${user.id}`);
        const res = await fetch(`/api/events/hosting?userId=${user.id}`);
        if (!res.ok) {
          console.error(`[Frontend] Hosting API error: ${res.status} ${res.statusText}`);
          const errorData = await res.json().catch(() => ({}));
          console.error(`[Frontend] Error details:`, errorData);
          return;
        }
        const data = await res.json();
        console.log(`[Frontend] Received ${Array.isArray(data) ? data.length : 0} hosting events:`, data);
        
        if (!Array.isArray(data)) {
          console.error('[Frontend] Hosting API did not return an array:', data);
          setHostingEvents([]);
          return;
        }
        
        const transformed = data.map((event: any) => {
          const eventDate = new Date(event.date);
          // Get creator name from proposal, fallback to host name or user name
          const creatorName = event.creator_name || event.host_name || user?.name || "Unknown";
          const hostName = event.host_name || user?.name || "You";
          return {
            id: event.id,
            title: event.title,
            host: hostName,
            hostAvatar: (hostName || "Y").slice(0, 2).toUpperCase(),
            creator: creatorName,
            creatorAvatar: (creatorName || "U").slice(0, 2).toUpperCase(),
            date: eventDate.toLocaleDateString(),
            time: eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            location: event.venue_address || "Online Event",
            attendees: Number(event.rsvp_count || 0) || 0,
            maxAttendees: 100,
            price: "Free",
            category: "Professional",
            description: event.description,
            eventType: event.event_type,
            meetingLink: "",
            isJoined: true,
            formattedDate: eventDate.toISOString().slice(0, 16),
            dateMs: eventDate.getTime(),
          };
        });
        console.log(`[Frontend] Transformed ${transformed.length} hosting events`);
        setHostingEvents(transformed);
      } catch (error) {
        console.error('[Frontend] Failed to fetch hosting events:', error);
        setHostingEvents([]);
      }
    };

    fetchHostingEvents();
  }, [user?.id]);

  // Fetch events from API with server-side search (debounced)
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('search', searchQuery);
        if (searchDate) params.set('date', searchDate);
        if (user?.id) params.set('userId', String(user.id));
        params.set('limit', '20'); // Events page shows more events
        const res = await fetch(`/api/events?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const transformedEvents = (data || []).map((event: any) => {
          const eventDate = new Date(event.date);
          return {
            id: event.id,
            title: event.title,
            host: "Event Host",
            hostAvatar: "EH",
            date: eventDate.toLocaleDateString(),
            time: eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            location: event.venue_address || "Online Event",
            attendees: Number(event.rsvp_count || 0) || 0,
            maxAttendees: 100,
            price: "Free",
            category: "Professional",
            description: event.description,
            eventType: event.event_type,
            meetingLink: event.meeting_link || "",
            isJoined: Boolean(event.is_registered),
            formattedDate: eventDate.toISOString().slice(0, 16),
            dateMs: eventDate.getTime(),
          };
        });
        setEvents(transformedEvents);
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          console.error('Failed to fetch events:', error);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [searchQuery, searchDate, user?.id]);

  
  const filteredEvents = events; // server-side filtered

  // Categorize by date
  const nowMs = Date.now();
  const upcomingEventsList = useMemo(() =>
    filteredEvents
      .filter((e: any) => typeof e.dateMs === 'number' ? e.dateMs >= nowMs : false)
      .sort((a: any, b: any) => (a.dateMs || 0) - (b.dateMs || 0))
  , [filteredEvents, nowMs]);

  const pastEventsList = useMemo(() =>
    filteredEvents
      .filter((e: any) => typeof e.dateMs === 'number' ? e.dateMs < nowMs : false)
      .sort((a: any, b: any) => (b.dateMs || 0) - (a.dateMs || 0))
  , [filteredEvents, nowMs]);

  const handleRSVPClick = (event: any) => {
    setSelectedEvent(event);
    setShowRSVPDialog(true);
  };

  const handleRSVPConfirm = async (event: any) => {
    try {
      if (!user) {
        toast.error("Please log in to RSVP.");
        return;
      }
      const res = await fetch(`/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(user.id),
          userEmail: user.email,
          userName: user.name,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === event.id ? { ...ev, isJoined: true, attendees: ev.attendees + 1 } : ev
          )
        );
      } else {
        toast.error(data.message);
      }
      setShowRSVPDialog(false);
    } catch (err) {
      console.error(err);
      toast.error("RSVP failed. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Toaster />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Events</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Discover and join professional networking events</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-2">
            <Button 
              className="rounded-full w-full sm:w-auto text-sm"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Propose Event</span>
              <span className="xs:hidden">Propose</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-auto">
              <Input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
          </div>
        </Card>

        <Tabs defaultValue="upcoming" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto sm:mx-0">
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">Upcoming</TabsTrigger>
            <TabsTrigger value="hosting" className="text-xs sm:text-sm">Hosting</TabsTrigger>
            <TabsTrigger value="past" className="text-xs sm:text-sm">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {upcomingEventsList.map((event) => (
                <Card key={event.id} className="p-4 sm:p-6 hover:shadow-sm transition-shadow">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-xs">
                        {event.category}
                      </Badge>
                      <Badge variant={event.price === "Free" ? "secondary" : "default"} className="text-xs">
                        {event.price}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2 line-clamp-2 text-sm sm:text-base">{event.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.time}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.attendees}/{event.maxAttendees} attending</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {event.hostAvatar}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">{event.host}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={event.isJoined ? "secondary" : "default"}
                        onClick={() => handleRSVPClick(event)}
                        className="text-xs sm:text-sm ml-2 flex-shrink-0"
                      >
                        {event.isJoined ? "Registered" : "RSVP"}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hosting" className="space-y-4">
            {hostingEvents.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-sm sm:text-base text-muted-foreground mb-4">No hosted events yet</p>
                <Button className="text-sm sm:text-base" onClick={() => setIsModalOpen(true)}>
                  Propose Your First Event
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {hostingEvents.map((event) => (
                  <Card key={event.id} className="p-4 sm:p-6 hover:shadow-sm transition-shadow">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-xs">
                          {event.category}
                        </Badge>
                        <Badge variant={event.price === "Free" ? "secondary" : "default"} className="text-xs">
                          {event.price}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2 line-clamp-2 text-sm sm:text-base">{event.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                      </div>

                      <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{event.date}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{event.time}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{event.attendees}/{event.maxAttendees} attending</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        {/* Creator info */}
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {event.creatorAvatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs text-muted-foreground">Created by: </span>
                            <span className="text-xs sm:text-sm font-medium truncate">{event.creator || "Unknown"}</span>
                          </div>
                        </div>
                        {/* Host info */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {event.hostAvatar}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs text-muted-foreground">Host: </span>
                              <span className="text-xs sm:text-sm font-medium truncate">{event.host}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs sm:text-sm ml-2 flex-shrink-0">
                            Hosting
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {pastEventsList.map((event) => (
                <Card key={event.id} className="p-4 sm:p-6 hover:shadow-sm transition-shadow">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="text-xs">
                        {event.category}
                      </Badge>
                      <Badge variant={event.price === "Free" ? "secondary" : "default"} className="text-xs">
                        {event.price}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2 line-clamp-2 text-sm sm:text-base">{event.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.date}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.time}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{event.attendees}/{event.maxAttendees} attending</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {event.hostAvatar}
                        </div>
                        <span className="text-xs sm:text-sm text-muted-foreground truncate">{event.host}</span>
                      </div>
                      <Button size="sm" variant="secondary" disabled className="text-xs sm:text-sm ml-2 flex-shrink-0">
                        Ended
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* RSVP Confirmation Modal */}
      <Modal
        isOpen={showRSVPDialog}
        onRequestClose={() => setShowRSVPDialog(false)}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        overlayClassName="fixed inset-0"
        ariaHideApp={false}
      >
        <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Confirm RSVP</h2>
          <p className="mb-4 text-sm sm:text-base">
            Confirm your RSVP for "{selectedEvent?.title}". A confirmation will be sent to your registered email.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowRSVPDialog(false)}
              className="w-full sm:w-auto text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleRSVPConfirm(selectedEvent)}
              className="bg-black hover:bg-black w-full sm:w-auto text-sm"
            >
              Confirm RSVP
            </Button>
          </div>
        </div>
      </Modal>

      {/* Event Proposal Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        overlayClassName="fixed inset-0"
        ariaHideApp={false}
      >
        <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Propose an Event</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const res = await fetch("/api/send-proposal", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...proposalData, userId: user?.id }),
                });
                const data = await res.json();
                if (data.success) {
                  toast.success("You will be connected within 24 hours");
                  setProposalData({
                    name: "",
                    email: "",
                    phone: "",
                    eventTitle: "",
                    eventDate: "",
                    mode: "Online",
                    description: "",
                  });
                  setIsModalOpen(false);
                } else {
                  toast.error("Failed to send proposal: " + data.message);
                }
              } catch (err) {
                console.error(err);
                toast.error("Failed to send proposal");
              }
              setLoading(false);
            }}
            className="space-y-3 sm:space-y-4"
          >
            <Input
              placeholder="Your Name"
              value={proposalData.name}
              onChange={(e) =>
                setProposalData({ ...proposalData, name: e.target.value })
              }
              required
              className="text-sm sm:text-base"
            />
            <Input
              placeholder="Your Email"
              type="email"
              value={proposalData.email}
              onChange={(e) =>
                setProposalData({ ...proposalData, email: e.target.value })
              }
              required
              className="text-sm sm:text-base"
            />
            <Input
              placeholder="Your Contact Number"
              type="tel"
              value={proposalData.phone}
              onChange={(e) =>
                setProposalData({ ...proposalData, phone: e.target.value })
              }
              required
              className="text-sm sm:text-base"
            />
            <Input
              placeholder="Event Title"
              value={proposalData.eventTitle}
              onChange={(e) =>
                setProposalData({ ...proposalData, eventTitle: e.target.value })
              }
              required
              className="text-sm sm:text-base"
            />
            <Input
              placeholder="Event Date"
              type="datetime-local"
              value={proposalData.eventDate}
              onChange={(e) =>
                setProposalData({ ...proposalData, eventDate: e.target.value })
              }
              required
              className="text-sm sm:text-base"
            />
            <select
              className="w-full p-2 sm:p-3 border rounded text-sm sm:text-base"
              value={proposalData.mode}
              onChange={(e) =>
                setProposalData({ ...proposalData, mode: e.target.value })
              }
            >
              <option value="Online">Online</option>
              <option value="Physical">Physical</option>
            </select>
            <textarea
              placeholder="Event Description"
              className="w-full p-2 sm:p-3 border rounded text-sm sm:text-base"
              rows={3}
              value={proposalData.description}
              onChange={(e) =>
                setProposalData({ ...proposalData, description: e.target.value })
              }
              required
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto text-sm"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto text-sm">
                {loading ? "Sending..." : "Send Proposal"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
