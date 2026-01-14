"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Send, Bot, User, MessageSquare, AlertCircle, CheckCircle2, TrendingUp, Clock, Zap } from "lucide-react"
import toast from "react-hot-toast"

// Types matching API response
interface NavigatorResult {
  user_id: number;
  name: string;
  role: string;
  avatar_url?: string | null;
  reward_tier: string;
  performance_signals: {
    score: number;
    activity_level: string;
    response_rate: string;
    top_skills: string[];
  };
  availability: boolean;
  response_likelihood: 'Low' | 'Medium' | 'High';
  match_reason: string;
}

interface SearchResponse {
  search_summary: {
    interpreted_role: string;
    context: string;
    confidence_level: 'Low' | 'Medium' | 'High';
  };
  results: NavigatorResult[];
  quick_message_preview?: string;
  error?: string;
}

export default function NavigatorPage() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Array<{ type: "user" | "ai"; content: string }>>([])
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<NavigatorResult[]>([])
  const [searchSummary, setSearchSummary] = useState<SearchResponse['search_summary'] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messagePreview, setMessagePreview] = useState<string>("")
  const [selectedUser, setSelectedUser] = useState<NavigatorResult | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setShowResults(false)
    setMessages((prev) => [...prev, { type: "user", content: query }])

    try {
      const res = await fetch('/api/navigator/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          search_intent: query,
          custom_message_template: "Hi {{name}}, I saw your impressive work in {{role}} and wanted to discuss a potential opportunity."
        })
      });

      const data: SearchResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to perform search');
      }

      setResults(data.results);
      setSearchSummary(data.search_summary);
      if (data.quick_message_preview) {
        setMessagePreview(data.quick_message_preview);
      }

      // Construct AI response based on results
      let aiResponse = "";
      if (data.results.length === 0) {
        aiResponse = `I understood you're looking for a ${data.search_summary.interpreted_role}, but I couldn't find any high-confidence matches in our network right now.`;
      } else {
        aiResponse = `I found ${data.results.length} high-performing professionals matching your criteria for "${data.search_summary.interpreted_role}". These candidates are ranked by verifiable performance data.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: aiResponse,
        },
      ])
      setShowResults(true)
    } catch (err: any) {
      console.error('Navigator AI Error:', err)
      setError(err.message || 'Failed to fetch professional recommendations')
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "I apologize, but I'm having trouble connecting to the Navigator engine right now. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
      setQuery("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleSendReachout = (user: NavigatorResult) => {
    // Simulate sending message
    toast.success(`Message sent to ${user.name}!`);
    setSelectedUser(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CompassIcon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Navigator AI</h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Discover high-performing professionals ranked by verifiable activity and outcomes, not just keywords.
          </p>
        </div>

        {/* Search Input */}
        <Card className="p-6 mb-8 border-primary/20 shadow-md">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Describe who you need... (e.g., 'Find a reliable React developer for a freelance project')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 py-6 text-lg"
              />
            </div>
            <Button onClick={handleSearch} disabled={!query.trim() || isLoading} size="lg" className="px-8">
              <Zap className="w-4 h-4 mr-2" />
              {isLoading ? "Analyzing..." : "Find Experts"}
            </Button>
          </div>
        </Card>

        {/* Chat Interface */}
        <div className="space-y-6 mb-8">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-start space-x-3 max-w-3xl ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${message.type === "user" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border"
                    }`}
                >
                  {message.type === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <Card className={`p-4 ${message.type === "user" ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm"}`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </Card>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex space-x-1 items-center h-8">
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Area */}
        {showResults && results.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
                Top Candidates
              </h2>
              {searchSummary && (
                <Badge variant="outline" className="px-3 py-1">
                  Intent: {searchSummary.interpreted_role} ({searchSummary.context})
                </Badge>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-1">
              {results.map((profile, index) => (
                <Card key={profile.user_id} className="p-0 overflow-hidden hover:shadow-md transition-all border-l-4 border-l-primary/60">
                  <div className="p-6 flex flex-col sm:flex-row items-start gap-4">

                    {/* Avatar / Rank */}
                    <div className="relative">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name} className="w-16 h-16 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                          {profile.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                        #{index + 1}
                      </div>
                    </div>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-bold truncate">{profile.name}</h3>
                        <Badge variant="secondary" className={`ml-2 ${getTierColor(profile.reward_tier)}`}>
                          {profile.reward_tier}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3">{profile.role}</p>

                      {/* Performance Signals */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center" title="Weighted Performance Score">
                          <TrendingUp className="w-4 h-4 mr-1 text-blue-500" />
                          <span className="font-semibold text-foreground">{profile.performance_signals.score}</span>
                          <span className="ml-1 text-xs text-muted-foreground">Orbit Score</span>
                        </div>
                        <div className="flex items-center" title="Recent Activity Level">
                          <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                          <span>{profile.performance_signals.activity_level} Activity</span>
                        </div>
                        <div className="flex items-center" title="Response Likelihood">
                          <Clock className="w-4 h-4 mr-1 text-green-500" />
                          <span>{profile.response_likelihood} Response Rate</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.performance_signals.top_skills.map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs bg-slate-50">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      <Button onClick={() => setSelectedUser(profile)} className="w-full sm:w-auto shadow-sm">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Draft Outreach
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                        View Profile
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted/30 px-6 py-2 border-t text-xs text-muted-foreground flex items-center">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-primary/70" />
                    Match Reason: {profile.match_reason}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outreach Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-lg shadow-xl border-primary/20">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Draft Outreach to {selectedUser.name}</h3>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-md mb-4 text-sm text-blue-800">
                <p className="font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Navigator Insight
                </p>
                This user has a {selectedUser.response_likelihood} likelihood of responding. Keep your message concise and outcome-focused.
              </div>

              <label className="text-sm font-medium mb-1 block">Message Preview</label>
              <textarea
                className="w-full min-h-[120px] p-3 rounded-md border text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                defaultValue={messagePreview.replace('{{name}}', selectedUser.name.split(' ')[0]).replace('{{role}}', selectedUser.role)}
              ></textarea>

              <div className="flex gap-3 mt-6 justify-end">
                <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button>
                <Button onClick={() => handleSendReachout(selectedUser)}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function getTierColor(tier: string) {
  switch (tier) {
    case 'Orbit Elite': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Luminary': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Rising Star': return 'bg-blue-100 text-blue-800 border-blue-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
