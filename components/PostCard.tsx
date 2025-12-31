"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Calendar, Upload, AlertCircle, Image, Video, Clock, Heart, MessageCircle, MoreHorizontal, MapPin, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { safeApiCall } from "@/lib/utils/api";
import toast from "react-hot-toast";

interface PostCardProps {
  onPostCreated?: () => void;
}

interface DailyStatus {
  canPost: boolean;
  dailyPostCount: number;
  maxPostsPerDay: number;
  remainingPosts: number;
  nextPostAllowedAt: string;
  message: string;
}

// Display Post Card Props (from post-card.tsx)
interface DisplayPostCardProps {
  author: {
    name: string
    role: string
    avatar: string
    rewardScore: number
  }
  content: string
  timestamp: string
  engagement: {
    likes: number
    comments: number
    shares: number
  }
  isLiked?: boolean
}

// Event Card Props (from post-card.tsx)
interface EventCardProps {
  title: string
  host: string
  date: string
  time: string
  location: string
  attendees: number
  isJoined?: boolean
}

export default function PostCard({ onPostCreated }: PostCardProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus | null>(null);
  const [error, setError] = useState<string>("");
  const [showPostCard, setShowPostCard] = useState(false);
  const [postType, setPostType] = useState<'post' | 'schedule'>('post');
  const [activeButton, setActiveButton] = useState<'post' | 'schedule' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Fetch daily post status on component mount
  // useEffect(() => {
  //   fetchDailyStatus();
  // }, []);

  // const fetchDailyStatus = async () => {
  //   try {
  //     const result = await safeApiCall(
  //       () => fetch('/api/posts/daily-status', {
  //         credentials: 'include',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         }
  //       }),
  //       'Failed to fetch daily status'
  //     );

  //     if (result.success && result.data) {
  //       setDailyStatus(result.data as DailyStatus);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching daily status:', error);
  //   }
  // };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => {
        const newFiles = [...prev, ...selectedFiles].slice(0, 2); // Max 2 files
        return newFiles;
      });
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleVideoUpload = () => {
    videoInputRef.current?.click();
  };

  const handlePostClick = () => {
    setPostType('post');
    setActiveButton('post');
    setShowPostCard(true);
  };

  const handleScheduleClick = () => {
    setPostType('schedule');
    setActiveButton('schedule');
    setShowPostCard(true);
    toast("This feature is enabled in Phase2/Version2", {
      icon: "📅",
      duration: 3000,
    });
  };

  const handleClosePostCard = () => {
    setShowPostCard(false);
    setActiveButton(null);
    setContent("");
    setFiles([]);
    setUploadedMedia([]);
    setScheduledAt("");
    setError("");
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      return [];
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const result = await safeApiCall(
      () => fetch('/api/posts/media', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      }),
      'Failed to upload files'
    );

    if (result.success && result.data) {
      const mediaArray = (result.data as any)?.data || result.data || [];
      if (Array.isArray(mediaArray) && mediaArray.length > 0) {
        setUploadedMedia(mediaArray as any[]);
        return mediaArray as any[];
      }
      // If files were provided but no media returned, throw error
      if (files.length > 0) {
        throw new Error('Media upload failed: No media data returned');
      }
      return [];
    } else {
      // Upload failed - throw error with message
      const errorMessage = (result.error as any)?.error || result.error || 'Failed to upload files';
      throw new Error(errorMessage);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    
    // Check daily limit before proceeding
    // if (dailyStatus && !dailyStatus.canPost) {
    //   setError('Daily post limit reached. You can only post once per day to encourage thoughtful content.');
    //   return;
    // }
    
    setIsSubmitting(true);
    setError("");
    try {
      // Upload files first if any
      let media: any[] = [];
      if (files.length > 0) {
        try {
          const uploadResult = await uploadFiles();
          media = Array.isArray(uploadResult) ? uploadResult : [];
          if (files.length > 0 && media.length === 0) {
            setError('Failed to upload media. Please try again.');
            setIsSubmitting(false);
            return;
          }
        } catch (uploadError: any) {
          setError(uploadError.message || 'Failed to upload media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Create post
      const result = await safeApiCall(
        () => fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: content.trim(),
            scheduledAt: scheduledAt || null,
            media
          }),
        }),
        'Failed to create post'
      );

      if (result.success) {
        // Reset form
        setContent("");
        setScheduledAt("");
        setFiles([]);
        setUploadedMedia([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
        if (videoInputRef.current) {
          videoInputRef.current.value = "";
        }
        
        // Refresh daily status
        // await fetchDailyStatus();
        
        // Notify parent component
        if (onPostCreated) {
          onPostCreated();
        }
      } else {
        // Handle specific error cases
        // if ((result.error as any)?.code === 'DAILY_LIMIT_REACHED') {
        //   setError((result.error as any).error || 'Daily post limit reached.');
        //   await fetchDailyStatus(); // Refresh status
        // } else {
          setError(result.error || 'Failed to create post');
        // }
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedule = async () => {
    if (!content.trim() || !scheduledAt) return;
    
    setIsSubmitting(true);
    setError("");
    try {
      // Upload files first if any
      let media: any[] = [];
      if (files.length > 0) {
        try {
          const uploadResult = await uploadFiles();
          media = Array.isArray(uploadResult) ? uploadResult : [];
          if (files.length > 0 && media.length === 0) {
            setError('Failed to upload media. Please try again.');
            setIsSubmitting(false);
            return;
          }
        } catch (uploadError: any) {
          setError(uploadError.message || 'Failed to upload media. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Create scheduled post
      const result = await safeApiCall(
        () => fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            content: content.trim(),
            scheduledAt: scheduledAt,
            media
          }),
        }),
        'Failed to schedule post'
      );

      if (result.success) {
        // Reset form
        setContent("");
        setScheduledAt("");
        setFiles([]);
        setUploadedMedia([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (imageInputRef.current) {
          imageInputRef.current.value = "";
        }
        if (videoInputRef.current) {
          videoInputRef.current.value = "";
        }
        
        // Refresh daily status
        // await fetchDailyStatus();
        
        // Notify parent component
        if (onPostCreated) {
          onPostCreated();
        }
      } else {
        // Handle specific error cases
        // if ((result.error as any)?.code === 'DAILY_LIMIT_REACHED') {
        //   setError((result.error as any).error || 'Daily post limit reached.');
        //   await fetchDailyStatus(); // Refresh status
        // } else {
          setError(result.error || 'Failed to schedule post');
        // }
      }
    } catch (error: any) {
      console.error('Error scheduling post:', error);
      setError(error.message || 'Failed to schedule post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    const date = new Date(dateTimeString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-4">
      {/* Always Visible Action Buttons */}
      <div className="flex justify-start gap-3">
        <Button
          onClick={handlePostClick}
          className={`px-6 ${
            activeButton === 'post' 
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-white text-black border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Post
        </Button>
        <Button
          onClick={handleScheduleClick}
          className={`px-6 ${
            activeButton === 'schedule' 
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-white text-black border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule
        </Button>
      </div>

      {/* Post Creation Card - Only shown when Post/Schedule is clicked */}
      {showPostCard && (
        <Card className="p-6 bg-white rounded-lg shadow-sm border">
          <div className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Text Input */}
            <Textarea
              placeholder="What do you want to talk about?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-gray-200 focus:border-gray-400"
              maxLength={2000}
            />

            {/* Media Upload Icons */}
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleImageUpload}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <Image className="h-5 w-5" />
                <span className="text-sm">Image</span>
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleVideoUpload}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <Video className="h-5 w-5" />
                <span className="text-sm">Video</span>
              </Button>

              {/* Show selected files */}
              {files.length > 0 && (
                <div className="flex gap-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                      <span className="text-xs text-gray-600">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date and Time Picker - Only for Schedule */}
            {postType === 'schedule' && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="flex-1"
                  placeholder="dd-mm-yyyy --:--"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleClosePostCard}
                variant="outline"
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={postType === 'post' ? handlePost : handleSchedule}
                disabled={!content.trim() || isSubmitting || (postType === 'schedule' && !scheduledAt)}
                className="px-6 bg-black text-white hover:bg-gray-800"
              >
                <Clock className="h-4 w-4 mr-2" />
                {isSubmitting ? "Posting..." : "Post"}
              </Button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </Card>
      )}
    </div>
  );
}

// Display Post Card Component (from post-card.tsx)
export function DisplayPostCard({ author, content, timestamp, engagement, isLiked = false }: DisplayPostCardProps) {
  const [liked, setLiked] = useState(isLiked)
  const [likeCount, setLikeCount] = useState(engagement.likes)

  const handleLike = () => {
    setLiked(!liked)
    setLikeCount(liked ? likeCount - 1 : likeCount + 1)
  }

  return (
    <Card className="p-6 hover:shadow-elevated transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm group">
      <div className="flex items-start space-x-4">
        <div className="relative">
          <div className="w-12 h-12 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center font-bold text-foreground shadow-soft border border-border/20">
            {author.avatar}
          </div>
          {author.rewardScore >= 90 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-foreground rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-background" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-wrap">
              <h4 className="font-bold text-base text-foreground">{author.name}</h4>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-1 bg-accent/80">
                {author.rewardScore}
              </Badge>
              <span className="text-sm text-muted-foreground font-medium">{author.role}</span>
              <span className="text-xs text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground/80 font-medium">{timestamp}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 hover:bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm mb-5 leading-relaxed text-foreground/90 text-balance">{content}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                className={`p-2 hover:bg-accent/50 transition-all duration-200 ${
                  liked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
                }`}
                onClick={handleLike}
              >
                <Heart className={`w-4 h-4 mr-2 transition-all ${liked ? "fill-current scale-110" : ""}`} />
                <span className="text-sm font-medium">{likeCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-accent/50 hover:text-blue-500 transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">{engagement.comments}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Event Card Component (from post-card.tsx)
export function EventCard({ title, host, date, time, location, attendees, isJoined = false }: EventCardProps) {
  const [joined, setJoined] = useState(isJoined)
  
  // Update local state when prop changes
  useEffect(() => {
    setJoined(isJoined)
  }, [isJoined])

  return (
    <Card className="p-6 border-l-4 border-l-foreground bg-gradient-to-r from-accent/30 to-accent/10 hover:shadow-elevated transition-all duration-300 gradient-border group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-foreground/10 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-foreground" />
          </div>
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 border-foreground/20 bg-background/50">
            Featured Event
          </Badge>
        </div>
        <Button
          variant={joined ? "secondary" : "default"}
          size="sm"
          onClick={() => setJoined(!joined)}
          className={`font-semibold transition-all duration-200 ${
            joined
              ? "bg-accent hover:bg-accent/80"
              : "bg-foreground hover:bg-foreground/90 shadow-soft hover:shadow-elevated"
          }`}
        >
          {joined ? "✓ Registered" : "Join Event"}
        </Button>
      </div>

      <h3 className="font-bold text-lg mb-2 text-foreground text-balance">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 font-medium">
        Hosted by <span className="text-foreground">{host}</span>
      </p>

      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="font-medium">
            {date} at {time}
          </span>
        </div>
        <div className="flex items-center space-x-3 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="font-medium">{location}</span>
        </div>
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            <span className="text-foreground font-bold">{attendees}</span> people attending
          </span>
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 bg-muted rounded-full border-2 border-background flex items-center justify-center text-xs font-bold"
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}


