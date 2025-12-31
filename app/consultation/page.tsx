"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock, DollarSign, Star, Award, CreditCard } from "lucide-react"

const consultantData = {
  name: "John Doe",
  role: "Product Manager",
  avatar: "JD",
  rewardScore: 85,
  rating: 4.9,
  totalSessions: 23,
  hourlyRate: 125, // Auto-calculated based on reward score
  expertise: ["Product Strategy", "Team Leadership", "User Research", "AI Implementation"],
}

const availableSlots = [
  { time: "9:00 AM", available: true },
  { time: "10:00 AM", available: false },
  { time: "11:00 AM", available: true },
  { time: "2:00 PM", available: true },
  { time: "3:00 PM", available: true },
  { time: "4:00 PM", available: false },
]

export default function ConsultationPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("")
  const [duration, setDuration] = useState("60")
  const [topic, setTopic] = useState("")
  const [description, setDescription] = useState("")

  const totalCost = consultantData.hourlyRate * (Number.parseInt(duration) / 60)

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Card className="p-8 mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-2xl font-bold">
              {consultantData.avatar}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{consultantData.name}</h1>
              <p className="text-lg text-muted-foreground mb-3">{consultantData.role}</p>
              <div className="flex items-center space-x-4">
                <Badge className="flex items-center">
                  <Award className="w-3 h-3 mr-1" />
                  Score: {consultantData.rewardScore}
                </Badge>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                  {consultantData.rating}/5 ({consultantData.totalSessions} sessions)
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">${consultantData.hourlyRate}</div>
              <div className="text-sm text-muted-foreground">per hour</div>
              <div className="text-xs text-muted-foreground mt-1">Rate set by Reward System</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Form */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Book Consultation</h2>

              <div className="space-y-6">
                {/* Date Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date()}
                  />
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Available Times</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="justify-center bg-transparent"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Topic */}
                <div>
                  <Label htmlFor="topic" className="text-sm font-medium mb-3 block">
                    Consultation Topic
                  </Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Product Strategy Review"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium mb-3 block">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe what you'd like to discuss..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Booking Summary & Payment */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span>{selectedDate?.toLocaleDateString() || "Not selected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{selectedTime || "Not selected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate:</span>
                  <span>${consultantData.hourlyRate}/hour</span>
                </div>
                <hr className="my-3" />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${totalCost.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="card" className="text-sm font-medium mb-2 block">
                    Card Number
                  </Label>
                  <Input id="card" placeholder="1234 5678 9012 3456" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry" className="text-sm font-medium mb-2 block">
                      Expiry
                    </Label>
                    <Input id="expiry" placeholder="MM/YY" />
                  </div>
                  <div>
                    <Label htmlFor="cvv" className="text-sm font-medium mb-2 block">
                      CVV
                    </Label>
                    <Input id="cvv" placeholder="123" />
                  </div>
                </div>
              </div>
            </Card>

            <Button className="w-full h-12 text-base" disabled={!selectedDate || !selectedTime || !topic}>
              <DollarSign className="w-5 h-5 mr-2" />
              Book Now - ${totalCost.toFixed(2)}
            </Button>

            {/* Expertise Areas */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Expertise Areas</h3>
              <div className="space-y-2">
                {consultantData.expertise.map((area) => (
                  <div key={area} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-foreground rounded-full"></div>
                    <span className="text-sm">{area}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
