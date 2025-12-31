"use client"

import type React from "react"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Send, Bot, User, MessageSquare, AlertCircle } from "lucide-react"
import { NavigatorService } from "@/lib/services/navigator-service"

interface Professional {
  id: string
  name: string
  role: string
  avatar: string
  rewardScore: number
  expertise: string[]
  location: string
  content: string
}

export default function NavigatorPage() {
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Array<{ type: "user" | "ai"; content: string }>>([])
  const [showResults, setShowResults] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)
    setMessages((prev) => [...prev, { type: "user", content: query }])

    try {
      // Call Navigator AI API using the NavigatorService
      const response = await NavigatorService.searchProfessionals(query, 10)
      
      // Transform professionals for UI
      const formattedProfessionals = NavigatorService.transformProfessionals(response)
      
      setProfessionals(formattedProfessionals)
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: NavigatorService.getSummary(response),
        },
      ])
      setShowResults(true)
    } catch (err) {
      console.error('Navigator AI Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch professional recommendations')
      setMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: "I apologize, but I'm having trouble connecting to the professional database right now. Please try again in a moment.",
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Navigator AI</h1>
          <p className="text-muted-foreground">
            Describe your problem or need, and we'll connect you with the right professionals
          </p>
        </div>

        {/* Search Input */}
        <Card className="p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Describe your problem or need... (e.g., 'Need help with React performance optimization')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 py-3 text-base"
              />
            </div>
            <Button onClick={handleSearch} disabled={!query.trim() || isLoading}>
              <Send className="w-4 h-4 mr-2" />
              {isLoading ? "Searching..." : "Find Experts"}
            </Button>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="p-4 mb-8 border-red-200 bg-red-50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </Card>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="space-y-4 mb-8">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-start space-x-3 max-w-3xl ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === "user" ? "bg-foreground text-background" : "bg-muted"
                    }`}
                  >
                    {message.type === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <Card className={`p-4 ${message.type === "user" ? "bg-foreground text-background" : "bg-card"}`}>
                    <p className="text-sm">{message.content}</p>
                  </Card>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <Card className="p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Professional Results */}
        {showResults && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recommended Professionals</h2>
              <Badge variant="secondary">Ranked by relevance</Badge>
            </div>

            <div className="space-y-4">
              {professionals.map((professional, index) => (
                <Card key={professional.id} className="p-6 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="relative">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-lg font-semibold">
                          {professional.avatar}
                        </div>
                        <Badge className="absolute -top-1 -right-1 bg-foreground text-background text-xs px-1">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-lg">{professional.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            Score: {professional.rewardScore}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-2">{professional.role}</p>
                        <p className="text-sm text-muted-foreground mb-3">{professional.location}</p>
                        <div className="flex flex-wrap gap-2">
                          {professional.expertise.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Button size="sm">Connect</Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedProfessional(professional)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Floating CTA */}
        {showResults && (
          <div className="fixed bottom-6 right-6">
            <Button size="lg" className="shadow-lg">
              <MessageSquare className="w-5 h-5 mr-2" />
              Draft Outreach Message with AI
            </Button>
          </div>
        )}

        {/* Professional Details Modal */}
        {selectedProfessional && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Professional Profile</h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedProfessional(null)}
                  >
                    Close
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-lg font-semibold">
                      {selectedProfessional.avatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{selectedProfessional.name}</h3>
                      <p className="text-muted-foreground">{selectedProfessional.role}</p>
                      <p className="text-sm text-muted-foreground">{selectedProfessional.location}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant="secondary">Score: {selectedProfessional.rewardScore}</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfessional.expertise.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Full Profile</h4>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedProfessional.content}</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 pt-4">
                    <Button className="flex-1">Connect</Button>
                    <Button variant="outline" className="flex-1">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
