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
import toast from "react-hot-toast"

interface Professional {
  id: string
  name: string
  role: string
  avatar: string
  rewardScore: number
  expertise: string[]
  matchScore: number
  location: string
  experience: string
  content: string
}

export default function ProductNavigatorPage() {
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

      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Navigator AI</h1>
          <p className="text-muted-foreground text-sm sm:text-base px-4 sm:px-0">
            Describe your problem or need, and we'll connect you with the right professionals
          </p>
        </div>

        {/* Search Input */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder="Describe your problem or need... (e.g., 'Need help with React performance optimization')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9 sm:pl-10 py-2 sm:py-3 text-sm sm:text-base"
              />
            </div>
            <Button onClick={handleSearch} disabled={!query.trim() || isLoading} className="w-full sm:w-auto text-sm sm:text-base">
              <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {isLoading ? "Searching..." : "Find Experts"}
            </Button>
          </div>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="p-3 sm:p-4 mb-6 sm:mb-8 border-red-200 bg-red-50">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-800 text-sm sm:text-base">{error}</p>
            </div>
          </Card>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-start space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-3xl ${message.type === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  <div
                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === "user" ? "bg-foreground text-background" : "bg-muted"
                    }`}
                  >
                    {message.type === "user" ? <User className="w-3 h-3 sm:w-4 sm:h-4" /> : <Bot className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </div>
                  <Card className={`p-3 sm:p-4 ${message.type === "user" ? "bg-foreground text-background" : "bg-card"}`}>
                    <p className="text-xs sm:text-sm">{message.content}</p>
                  </Card>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 sm:space-x-3 max-w-[90%] sm:max-w-3xl">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                  </div>
                  <Card className="p-3 sm:p-4">
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"
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
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <h2 className="text-lg sm:text-xl font-semibold">Recommended Professionals</h2>
              <Badge variant="secondary" className="text-xs sm:text-sm w-fit">Ranked by relevance</Badge>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {professionals.map((professional, index) => (
                <Card key={professional.id} className="p-4 sm:p-6 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center text-sm sm:text-lg font-semibold">
                          {professional.avatar}
                        </div>
                        <Badge className="absolute -top-1 -right-1 bg-foreground text-background text-xs px-1">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{professional.name}</h3>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Score: {professional.rewardScore}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Match: {professional.matchScore}%
                            </Badge>
                          </div>
                        </div>
                        <p className="text-muted-foreground text-sm sm:text-base mb-1 sm:mb-2 truncate">{professional.role}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 truncate">{professional.location}</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {professional.expertise.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2 flex-shrink-0">
                      <Button 
                        size="sm" 
                        className="text-xs sm:text-sm"
                        onClick={() => {
                          toast("This feature is enabled in Phase2/Version2", {
                            duration: 3000,
                          })
                        }}
                      >
                        Connect
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          toast("This feature is enabled in Phase2/Version2", {
                            duration: 3000,
                          })
                        }}
                        className="text-xs sm:text-sm"
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
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
            <Button 
              size="sm" 
              className="shadow-lg text-xs sm:text-sm"
              onClick={() => {
                toast("This feature is enabled in Phase2/Version2", {
                  duration: 3000,
                })
              }}
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Draft Outreach Message with AI</span>
              <span className="sm:hidden">Draft Message</span>
            </Button>
          </div>
        )}

        {/* Professional Details Modal */}
        {selectedProfessional && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <Card className="max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold">Professional Profile</h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedProfessional(null)}
                    className="text-xs sm:text-sm"
                  >
                    Close
                  </Button>
                </div>
                
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center text-sm sm:text-lg font-semibold flex-shrink-0">
                      {selectedProfessional.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold truncate">{selectedProfessional.name}</h3>
                      <p className="text-muted-foreground text-sm sm:text-base truncate">{selectedProfessional.role}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{selectedProfessional.location}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">Score: {selectedProfessional.rewardScore}</Badge>
                        <Badge variant="outline" className="text-xs">Match: {selectedProfessional.matchScore}%</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Expertise</h4>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {selectedProfessional.expertise.map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Experience</h4>
                    <div className="bg-muted p-3 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{selectedProfessional.experience}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-sm sm:text-base">Full Profile</h4>
                    <div className="bg-muted p-3 sm:p-4 rounded-lg">
                      <p className="text-xs sm:text-sm whitespace-pre-wrap">{selectedProfessional.content}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-3 sm:pt-4">
                    <Button 
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => {
                        toast("This feature is enabled in Phase2/Version2", {
                          duration: 3000,
                        })
                      }}
                    >
                      Connect
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1 text-xs sm:text-sm"
                      onClick={() => {
                        toast("This feature is enabled in Phase2/Version2", {
                          duration: 3000,
                        })
                      }}
                    >
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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

