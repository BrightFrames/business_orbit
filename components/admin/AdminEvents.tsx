"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";

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

interface EventProposal {
  id: number;
  name: string;
  email: string;
  phone: string;
  event_title: string;
  event_date: string;
  mode: string;
  description: string;
  status: string;
  created_at: string;
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

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch all events from the admin management API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/management/events", {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        // Events are already filtered at database level, but keep this as safety check
        const visible = Array.isArray(data) ? data : [];
        setEvents(visible);
      } else {
        const errorData = await res.json();
        console.error("Failed to fetch events:", errorData);
        setError(`Failed to load events: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
      setError('Network error: Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending proposals
  const fetchProposals = async () => {
    try {
      const res = await fetch("/api/event-proposals?status=pending");
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (err) {
      console.error("Failed to fetch proposals", err);
    }
  };

  // Fetch RSVPs for an event
  const fetchRSVPs = async (eventId: number) => {
    try {
      const res = await fetch(`/api/admin/management/events?id=${eventId}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setRsvps(data.attendees || []);
    } catch (err) {
      console.error("Failed to fetch RSVPs", err);
    }
  };

  // Refresh events data
  const refreshEvents = () => {
    fetchEvents();
  };

  // Approve proposal and create event
  const approveProposal = async (proposal: EventProposal) => {
    try {
      const res = await fetch("/api/event-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id })
      });

      if (res.ok) {
        await fetchProposals();
        await fetchEvents();
        setSuccessMessage("Proposal approved and event created!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        setError("Failed to approve proposal: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error approving proposal:", err);
      setError("Failed to approve proposal");
    }
  };

  // Reject proposal
  const rejectProposal = async (proposal: EventProposal) => {
    try {
      if (!confirm('Are you sure you want to reject this proposal?')) return;

      const res = await fetch(`/api/event-proposals?id=${proposal.id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await fetchProposals();
        setSuccessMessage("Proposal rejected");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        setError("Failed to reject proposal: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error rejecting proposal:", err);
      setError("Failed to reject proposal");
    }
  };

  // Auto-refresh every 60 seconds (reduced frequency for better performance)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents();
      fetchProposals();
    }, 60000); // Changed from 30000 to 60000 (30s to 60s)

    return () => clearInterval(interval);
  }, []);

  // Clear error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
        credentials: 'include',
        body: selectedEvent
          ? JSON.stringify({ id: selectedEvent.id, ...payload })
          : JSON.stringify(payload),
      });

      console.log("Response status:", res.status);

      if (res.ok) {
        const savedEvent = await res.json();
        console.log("Event saved successfully:", savedEvent);
        refreshEvents();
        reset();
        setSelectedEvent(null);
        setShowDialog(false);
        setSuccessMessage("Event saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        const error = await res.json();
        console.error("API Error:", error);
        setError("Failed to save event: " + (error.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error saving event:", err);
      setError("Error saving event");
    }
  };

  // Cancel event
  const cancelEvent = async (event: Event) => {
    try {
      if (!confirm('Are you sure you want to cancel this event?')) return;
      
      const res = await fetch('/api/admin/management/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          id: event.id, 
          title: event.title, 
          description: event.description, 
          date: event.date, 
          event_type: event.event_type, 
          meeting_link: event.meeting_link, 
          venue_address: event.venue_address, 
          status: 'cancelled' 
        }),
      });

      if (res.ok) {
        refreshEvents();
        setSuccessMessage('Event cancelled and attendees notified.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const error = await res.json();
        setError('Failed to cancel event: ' + (error.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      setError('Failed to cancel event');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          <div className="mb-4 mt-12 lg:mt-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Event Dashboard</h1>
          </div>
          <div className="animate-pulse bg-gray-200 h-8 sm:h-10 w-32 sm:w-40 rounded"></div>
        </div>
        <div className="animate-pulse bg-gray-200 h-48 sm:h-64 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-4">
          <div className="mb-4 mt-12 lg:mt-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Event Dashboard</h1>
          </div>
          <Button 
            onClick={refreshEvents}
            className="bg-black text-white font-semibold px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-800 text-sm sm:text-base"
          >
            Create New Event
          </Button>
        </div>
        <div className="p-3 sm:p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <p className="font-medium text-sm sm:text-base">Error Loading Events</p>
          <p className="text-xs sm:text-sm mt-1">{error}</p>
          <Button 
            onClick={refreshEvents}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="mb-4 mt-12 lg:mt-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Admin Event Dashboard</h1>
        </div>
        
        {/* Create New Event Button */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-black text-white font-semibold px-4 sm:px-6 py-2 rounded-lg hover:bg-gray-800 text-sm sm:text-base">
              Create New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">{selectedEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            </DialogHeader>
            <form className="space-y-3 mt-4" onSubmit={handleSubmit(onSubmit)}>
              <Input {...register("title", { required: true })} placeholder="Title" className="w-full" />
              <Input {...register("description")} placeholder="Description" className="w-full" />
              <Input {...register("date", { required: true })} type="datetime-local" className="w-full" />
              <Select value={eventType} onValueChange={(value) => setValue("eventtype", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(value) => setValue("status", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Input {...register("meetingLink")} placeholder="Meeting Link" className="w-full" />
              <Input {...register("venueAddress")} placeholder="Venue Address" className="w-full" />

              <div className="flex flex-col sm:flex-row justify-end gap-2 mt-2">
                <DialogClose asChild>
                  <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto"
                >
                  Save
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-3 sm:p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
          <p className="text-sm sm:text-base">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <p className="font-medium text-sm sm:text-base">Error</p>
          <p className="text-xs sm:text-sm mt-1">{error}</p>
          <Button 
            onClick={() => setError(null)}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Event Proposals Section */}
      {proposals.length > 0 && (
        <div className="border border-orange-300 rounded-lg overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b border-orange-300">
            <h2 className="text-lg font-semibold text-orange-900">
              Pending Event Proposals ({proposals.length})
            </h2>
          </div>
          
          <div className="divide-y divide-orange-200">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Proposed by</p>
                    <p className="font-semibold text-gray-900">{proposal.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact</p>
                    <p className="text-sm text-gray-900">{proposal.email}</p>
                    <p className="text-sm text-gray-900">{proposal.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Event Title</p>
                    <p className="font-semibold text-gray-900">{proposal.event_title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="text-sm text-gray-900">
                      {new Date(proposal.event_date).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Mode</p>
                    <p className="text-sm font-medium text-gray-900">{proposal.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-900 line-clamp-2">{proposal.description || 'No description'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => approveProposal(proposal)}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => rejectProposal(proposal)}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Table */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Title</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">RSVP Count</th>
                <th className="px-4 py-3 text-left font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No events found. Create your first event to get started.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{event.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(event.date).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{event.event_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' :
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{event.rsvp_count || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => onEdit(event)}
                          className="bg-black text-white hover:bg-gray-800"
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => fetchRSVPs(event.id)}
                          className="bg-black text-white hover:bg-gray-800"
                        >
                          View RSVPs
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => cancelEvent(event)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden">
          {events.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No events found. Create your first event to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <div key={event.id} className="p-4 hover:bg-gray-50">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">{event.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.status === 'approved' ? 'bg-green-100 text-green-800' :
                        event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>Date:</span>
                        <span>{new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Type:</span>
                        <span className="capitalize">{event.event_type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>RSVPs:</span>
                        <span>{event.rsvp_count || 0}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => onEdit(event)}
                        className="bg-black text-white hover:bg-gray-800 text-xs"
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => fetchRSVPs(event.id)}
                        className="bg-black text-white hover:bg-gray-800 text-xs"
                      >
                        View RSVPs
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => cancelEvent(event)}
                        className="bg-red-600 text-white hover:bg-red-700 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RSVP List */}
      {rsvps.length > 0 && (
        <div className="mt-4 max-h-48 sm:max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 sm:p-4">
          <h3 className="font-semibold mb-2 text-base sm:text-lg">RSVP List</h3>
          <div className="space-y-2">
            {rsvps.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 last:border-b-0 gap-1 sm:gap-0">
                <span className="text-xs sm:text-sm text-gray-900 font-medium">{r.name}</span>
                <span className="text-xs sm:text-sm text-gray-600">{r.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
