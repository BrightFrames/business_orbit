"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

type SearchCategory = "people" | "chapter" | "events" | null

interface SearchResult {
  chapters: Array<{ id: string; name: string; location_city: string }>
  people: Array<{ id: number; name: string; profession: string | null; profile_photo_url: string | null }>
  events: Array<{ id: number; title: string; date: string; event_type: string; venue_address: string | null }>
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<SearchCategory>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<SearchResult | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setQ("")
      setCategory(null)
      setData(null)
      setError(null)
      setLoading(false)
    }
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus input when modal opens for immediate typing
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [open])

  const runSearch = async () => {
    if (!category) {
      setError("Please select a category (People, Chapter, or Events)")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        q: q,
        limit: '5',
        category: category
      })
      const res = await fetch(`/api/search?${params.toString()}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error || 'Search failed')
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-4">
      <Card className="w-full max-w-3xl bg-background border shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            <span className="text-base font-semibold">Search</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close search">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4">
          {/* Category Buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={category === "people" ? "default" : "outline"}
              onClick={() => setCategory("people")}
              className="flex-1"
            >
              People
            </Button>
            <Button
              variant={category === "chapter" ? "default" : "outline"}
              onClick={() => setCategory("chapter")}
              className="flex-1"
            >
              Chapter
            </Button>
            <Button
              variant={category === "events" ? "default" : "outline"}
              onClick={() => setCategory("events")}
              className="flex-1"
            >
              Events
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              aria-label="Search"
              placeholder={
                category === "people" 
                  ? "Type to search people by name" 
                  : category === "chapter"
                  ? "Type to search chapters by location or name"
                  : category === "events"
                  ? "Type to search events by title"
                  : "Select a category above to search"
              }
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              className="pl-12 h-12 text-base placeholder:text-muted-foreground ring-1 ring-border focus-visible:ring-2 focus-visible:ring-foreground/30"
            />
          </div>

          <div className="mt-3">
            <Button onClick={runSearch} disabled={!q.trim() || !category || loading} className="w-full sm:w-auto">
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {error && (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          )}

          {!loading && data && (
            <div className="mt-4">
              {category === "people" && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">People</h3>
                  <div className="space-y-2">
                    {data.people.length === 0 && <p className="text-sm text-muted-foreground">No people found</p>}
                    {data.people.map((p) => (
                      <Card key={p.id} className="p-3 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.profession || 'Professional'}</div>
                          </div>
                          <Badge variant="outline">Person</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {category === "chapter" && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Chapters</h3>
                  <div className="space-y-2">
                    {data.chapters.length === 0 && <p className="text-sm text-muted-foreground">No chapters found</p>}
                    {data.chapters.map((c) => (
                      <Card key={c.id} className="p-3 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.location_city}</div>
                          </div>
                          <Badge variant="outline">Chapter</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {category === "events" && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Events</h3>
                  <div className="space-y-2">
                    {data.events.length === 0 && <p className="text-sm text-muted-foreground">No events found</p>}
                    {data.events.map((e) => (
                      <Card key={e.id} className="p-3 hover:bg-accent/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{e.title}</div>
                            <div className="text-xs text-muted-foreground">{new Date(e.date).toLocaleString()}</div>
                          </div>
                          <Badge variant="outline">{e.event_type}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !data && (
            <div className="mt-6 text-sm text-muted-foreground">
              Select a category above and start typing to search.
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}


