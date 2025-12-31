"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Users, Mail, Calendar, MapPin, MessageSquare, Settings, LayoutDashboard, MapPinned } from "lucide-react";

// Chat Management Component (from AdminChat.tsx)
interface ChatItem {
  id: number;
  type: "News" | "Meme" | "Update";
  content: string;
}

interface ChatManagementProps {
  className?: string;
}

export function ChatManagement({ className = "" }: ChatManagementProps) {
  const [items, setItems] = useState<ChatItem[]>([
    { id: 1, type: "News", content: "New business regulations released" },
    { id: 2, type: "Meme", content: "https://i.imgur.com/xyz123.jpg" },
  ]);

  const [newType, setNewType] = useState<"News" | "Meme" | "Update">("News");
  const [newContent, setNewContent] = useState("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<ChatItem | null>(null);

  const handleAdd = () => {
    if (newType === "Meme" && !newImage) return;
    if ((newType !== "Meme") && !newContent.trim()) return;

    const newItem: ChatItem = {
      id: Date.now(),
      type: newType,
      content: newType === "Meme" ? URL.createObjectURL(newImage!) : newContent,
    };

    setItems([...items, newItem]);
    setNewContent("");
    setNewImage(null);
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleEdit = (item: ChatItem) => {
    setEditingItem(item);
    setNewType(item.type);
    setNewContent(item.content);
  };

  const handleUpdate = () => {
    if (!newContent.trim()) return;
    setItems(
      items.map((item) =>
        item.id === editingItem!.id
          ? { ...item, type: newType, content: newContent }
          : item
      )
    );
    setEditingItem(null);
    setNewContent("");
  };

  return (
    <div className={`bg-white shadow-lg rounded-lg p-6 ${className}`}>
      <h1 className="text-2xl font-bold mb-4">Chats Management</h1>

      {/* Add / Edit Form */}
      <div className="flex flex-col gap-3 mb-6">
        <Select value={newType} onValueChange={(value: "News" | "Meme" | "Update") => {
          setNewType(value);
          setNewContent("");
          setNewImage(null);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="News">News</SelectItem>
            <SelectItem value="Meme">Meme</SelectItem>
            <SelectItem value="Update">Update</SelectItem>
          </SelectContent>
        </Select>

        {newType === "Meme" ? (
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setNewImage(e.target.files?.[0] || null)}
            className="border rounded px-3 py-1"
          />
        ) : (
          <Input
            type="text"
            placeholder={`Enter ${newType}...`}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="border rounded px-3 py-1"
          />
        )}

        {editingItem ? (
          <Button
            onClick={handleUpdate}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Update
          </Button>
        ) : (
          <Button
            onClick={handleAdd}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Add
          </Button>
        )}
      </div>

      {/* Items List */}
      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="bg-gray-100 p-3 rounded shadow flex flex-col gap-2"
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold">{item.type}</span>
              <div className="space-x-2">
                <Button
                  onClick={() => handleEdit(item)}
                  className="bg-black text-white px-3 py-1 rounded hover:bg-gray-600"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>

            {item.type === "Meme" ? (
              <img
                src={item.content}
                alt="Meme"
                className="rounded-lg max-h-64 object-contain border"
              />
            ) : (
              <p>{item.content}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Events Management Component (from AdminEvents.tsx)
interface Event {
  id: number;
  title: string;
  description?: string;
  date: string;
  event_type: string;
  status: string;
  rsvp_count: number;
  meeting_link?: string;
  venue_address?: string;
}

interface RSVP {
  id: number;
  name: string;
  email: string;
}

type FormValues = {
  title: string;
  description?: string;
  date: string;
  eventtype: string;
  status: string;
  meetingLink?: string | null;
  venueAddress?: string | null;
}

interface EventsManagementProps {
  className?: string;
}

export function EventsManagement({ className = "" }: EventsManagementProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      date: '',
      status: 'pending',
      eventtype: 'online',
      meetingLink: '',
      venueAddress: '',
    },
  });
  
  // Watch form values for Select components
  const eventType = watch("eventtype");
  const status = watch("status");

  // Fetch all events
  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/management/events");
      const data = await res.json();
      // Hide cancelled events from the dashboard list
      const visible = Array.isArray(data) ? data.filter((e: Event) => String(e.status).toLowerCase() !== 'cancelled') : [];
      setEvents(visible);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  };

  // Fetch RSVPs for an event
  const fetchRSVPs = async (eventId: number) => {
    try {
      const res = await fetch(`/api/admin/management/events?id=${eventId}`);
      const data = await res.json();
      setRsvps(data.attendees || []);
    } catch (err) {
      console.error("Failed to fetch RSVPs", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Edit or prefill event
  const onEdit = (event: Event) => {
    setSelectedEvent(event);
    // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
    const formattedDate = new Date(event.date).toISOString().slice(0, 16);
    reset({
      title: event.title,
      description: event.description || "",
      date: formattedDate,
      eventtype: event.event_type,
      status: event.status,
      meetingLink: event.meeting_link || "",
      venueAddress: event.venue_address || "",
    });
    setShowDialog(true);
  };

  // Save event (create or update)
  const onSubmit = async (formData: any) => {
    console.log("Form submitted with data:", formData);
    
    const payload = {
      title: formData.title,
      description: formData.description || "",
      date: formData.date,
      event_type: formData.eventtype,
      meeting_link: formData.meetingLink || null,
      venue_address: formData.venueAddress || null,
      status: formData.status || 'pending',
    };

    console.log("Payload being sent:", payload);

    try {
      const res = await fetch("/api/admin/management/events", {
        method: selectedEvent ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: selectedEvent
          ? JSON.stringify({ id: selectedEvent.id, ...payload })
          : JSON.stringify(payload),
      });

      console.log("Response status:", res.status);

      if (res.ok) {
        const savedEvent = await res.json();
        console.log("Event saved successfully:", savedEvent);
        fetchEvents();
        reset();
        setSelectedEvent(null);
        setShowDialog(false);
        setSuccessMessage("Event saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        console.error("API Error:", error);
        alert("Failed to save event: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Error saving event");
    }
  };

  return (
    <div className={`p-4 ${className}`}>
      <h1 className="text-2xl font-bold mb-4">Admin Event Dashboard</h1>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-200 text-green-800 rounded">
          {successMessage}
        </div>
      )}

      {/* Create/Edit Event Button */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button className="mb-4 bg-black text-white font-semibold px-6 py-2 rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105 hover:bg-black hover:shadow-xl active:scale-95">
            {selectedEvent ? "Edit Event" : "Create New Event"}
          </Button>
        </DialogTrigger>
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? "Edit Event" : "Create Event"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3 mt-4" onSubmit={handleSubmit(onSubmit)}>
            <Input {...register("title", { required: true })} placeholder="Title" />
            <Input {...register("description")} placeholder="Description" />
            <Input {...register("date", { required: true })} type="datetime-local" />
            <Select value={eventType} onValueChange={(value) => setValue("eventtype", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="physical">Physical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setValue("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input {...register("meetingLink")} placeholder="Meeting Link" />
            <Input {...register("venueAddress")} placeholder="Venue Address" />

            <div className="flex justify-end gap-2 mt-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white transition-all duration-300"
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Events Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Title</th>
            <th className="border px-4 py-2">Date</th>
            <th className="border px-4 py-2">Type</th>
            <th className="border px-4 py-2">Status</th>
            <th className="border px-4 py-2">RSVP Count</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="text-center">
              <td className="border px-4 py-2">{event.title}</td>
              <td className="border px-4 py-2">{new Date(event.date).toLocaleString()}</td>
              <td className="border px-4 py-2">{event.event_type}</td>
              <td className="border px-4 py-2">{event.status}</td>
              <td className="border px-4 py-2">{event.rsvp_count}</td>
              <td className="border px-4 py-2 flex justify-center gap-2">
                <Button size="sm" onClick={() => onEdit(event)}>
                  Edit
                </Button>
                <Button size="sm" onClick={() => fetchRSVPs(event.id)}>
                  View RSVPs
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    try {
                      if (!confirm('Are you sure you want to cancel this event?')) return;
                      await fetch('/api/admin/management/events', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: event.id, title: event.title, description: event.description, date: event.date, event_type: event.event_type, meeting_link: event.meeting_link, venue_address: event.venue_address, status: 'cancelled' }),
                      });
                      // Optimistically remove from current list
                      setEvents(prev => prev.filter(e => e.id !== event.id));
                      // Then refresh from server (which we also filter in fetchEvents)
                      await fetchEvents();
                      setSuccessMessage('Event cancelled and attendees notified.');
                      setTimeout(() => setSuccessMessage(''), 3000);
                    } catch (e) {
                      console.error(e);
                      alert('Failed to cancel event');
                    }
                  }}
                >
                  Cancel
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RSVP List */}
      {rsvps.length > 0 && (
        <div className="mt-4 max-h-64 overflow-y-auto border p-2 rounded">
          <h3 className="font-semibold mb-2">RSVP List</h3>
          {rsvps.map((r) => (
            <div key={r.id} className="flex justify-between border-b py-1">
              <span>{r.name}</span>
              <span>{r.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Members Management Component (from AdminMembers.tsx)
interface Member {
  id: number;
  name: string;
  email: string;
  profilePhotoUrl?: string;
  userJoinedAt: string;
  chapters: Array<{
    chapter_id: string;
    chapter_name: string;
    location_city: string;
    joined_at: string;
  }>;
}

interface ChapterStats {
  totalMembers: number;
  totalChapters: number;
  membersByChapter: Array<{
    chapterName: string;
    location: string;
    memberCount: number;
  }>;
}

interface MembersManagementProps {
  className?: string;
}

export function MembersManagement({ className = "" }: MembersManagementProps) {
  const [filter, setFilter] = useState<"All" | "Recent" | "ByChapter">("All");
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<ChapterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  // Fetch all members with their chapter information
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/members', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out test users
        const filteredMembers = (data.members || []).filter((member: Member) => 
          !member.name.toLowerCase().includes('test user') && 
          !member.email.toLowerCase().includes('test')
        );
        setMembers(filteredMembers);
      } else {
        console.error('Failed to fetch members:', await response.json());
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch chapter statistics
  const fetchChapterStats = async () => {
    try {
      const response = await fetch('/api/admin/analytics/chapters', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats({
            totalMembers: data.stats.totalMembers,
            totalChapters: data.stats.totalChapters,
            membersByChapter: data.stats.chaptersWithMembers.map((chapter: any) => ({
              chapterName: chapter.chapterName,
              location: chapter.location,
              memberCount: chapter.memberCount
            }))
          });
        }
      } else {
        console.error('Failed to fetch chapter stats:', await response.json());
      }
    } catch (error) {
      console.error('Error fetching chapter stats:', error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      fetchChapterStats();
    }
  }, [members.length]);

  const filteredMembers = (() => {
    if (filter === "Recent") {
      // Show 10 most recent members (sorted by join date)
      return members
        .sort((a, b) => new Date(b.userJoinedAt).getTime() - new Date(a.userJoinedAt).getTime())
        .slice(0, 10);
    } else if (filter === "ByChapter" && selectedChapter) {
      return members.filter(member => 
        member.chapters.some(chapter => chapter.chapter_name === selectedChapter)
      );
    }
    return members;
  })();

  if (loading) {
    return (
      <div className={`space-y-4 sm:space-y-6 ${className}`}>
        <div className="space-y-4">
          <div className="mb-4 mt-12 lg:mt-0">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/3 mb-2"></div>
            <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 sm:w-1/2"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 sm:h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 sm:h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Header */}
      <div className="space-y-4">
        <div className="mb-4 mt-12 lg:mt-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Members Management</h1>
        </div>
        <p className="text-sm sm:text-base text-muted-foreground">Manage and monitor member activity across all chapters</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-black">Total Members</p>
                <p className="text-xl sm:text-2xl font-bold text-black">{stats.totalMembers}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-black">Total Chapters</p>
                <p className="text-xl sm:text-2xl font-bold text-black">{stats.totalChapters}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-black flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-black">Active Members</p>
                <p className="text-xl sm:text-2xl font-bold text-black">{filteredMembers.length}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Chapter-wise Members */}
      {stats && stats.membersByChapter.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-black">Chapter-wise Member Count</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {stats.membersByChapter.map((chapter, index) => (
              <div key={index} className="p-3 sm:p-4 border rounded-lg">
                <h4 className="font-medium text-black text-sm sm:text-base truncate">{chapter.chapterName}</h4>
                <p className="text-xs sm:text-sm text-black truncate">{chapter.location}</p>
                <p className="text-xl sm:text-2xl font-bold text-black mt-2">{chapter.memberCount}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Members Management */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-4 sm:gap-0">
          <div className="flex flex-wrap gap-2">
            {(["All", "Recent", "ByChapter"] as const).map((f) => (
              <Button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium transition ${
                  filter === f
                    ? "bg-black text-white"
                    : "bg-gray-200 text-black hover:bg-gray-300"
                }`}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Chapter Filter for ByChapter */}
        {filter === "ByChapter" && stats && (
          <div className="mb-4">
            <select
              value={selectedChapter || ""}
              onChange={(e) => setSelectedChapter(e.target.value || null)}
              className="w-full px-3 py-2 border rounded-lg text-black text-sm sm:text-base"
            >
              <option value="">Select a chapter</option>
              {stats.membersByChapter.map((chapter, index) => (
                <option key={index} value={chapter.chapterName}>
                  {chapter.chapterName} ({chapter.location})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm hover:shadow-md transition gap-3 sm:gap-0"
            >
              {/* Left Side */}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                  {member.profilePhotoUrl ? (
                    <img
                      src={member.profilePhotoUrl}
                      alt={member.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm sm:text-lg font-semibold text-black truncate">{member.name}</h2>
                  <p className="text-xs sm:text-sm text-black flex items-center truncate">
                    <Mail className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </p>
                  <p className="text-xs text-black flex items-center">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                    Joined: {new Date(member.userJoinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Right Side - Chapter Info */}
              <div className="text-left sm:text-right">
                <p className="text-xs sm:text-sm font-medium text-black">
                  {member.chapters.length} Chapter{member.chapters.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {member.chapters.slice(0, 2).map((chapter, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-black border-black">
                      <span className="truncate max-w-20 sm:max-w-none">{chapter.chapter_name}</span>
                    </Badge>
                  ))}
                  {member.chapters.length > 2 && (
                    <Badge variant="outline" className="text-xs text-black border-black">
                      +{member.chapters.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredMembers.length === 0 && (
            <div className="text-center py-6 sm:py-8">
              <Users className="w-10 h-10 sm:w-12 sm:h-12 text-black mx-auto mb-4" />
              <p className="text-black text-sm sm:text-base">
                {filter === "ByChapter" && !selectedChapter
                  ? "Please select a chapter to view members"
                  : `No ${filter.toLowerCase()} members found.`
                }
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Main Admin Dashboard Component
interface AdminDashboardProps {
  activeTab?: 'chat' | 'events' | 'members' | 'settings';
  className?: string;
}

export default function AdminDashboard({ activeTab = 'chat', className = "" }: AdminDashboardProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

  const tabs = [
    { id: 'chat', name: 'Chat Management', icon: MessageSquare },
    { id: 'events', name: 'Events Management', icon: Calendar },
    { id: 'members', name: 'Members Management', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case 'chat':
        return <ChatManagement />;
      case 'events':
        return <EventsManagement />;
      case 'members':
        return <MembersManagement />;
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Admin Settings</h1>
            <p className="text-gray-600">Settings management coming soon...</p>
          </div>
        );
      default:
        return <ChatManagement />;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Content - No top navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}
