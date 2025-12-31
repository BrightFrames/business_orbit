"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Sparkles, MoreVertical, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { safeApiCall } from "@/lib/utils/api";
import CommentsSection from "./CommentsSection";
import toast from "react-hot-toast";

interface Post {
  id: string;
  content: string;
  published_at: string;
  created_at: string;
  user_id: number;
  user_name: string;
  profile_photo_url?: string;
  profession?: string;
  likes: number;
  comments: number;
  shares: number;
  media: Array<{
    id: string;
    media_type: string;
    cloudinary_url: string;
    file_name: string;
  }>;
}

interface FeedPostProps {
  post: Post;
  onEngagementChange?: () => void;
  onPostDeleted?: () => void;
}

export default function FeedPost({ post, onEngagementChange, onPostDeleted }: FeedPostProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [isEngaging, setIsEngaging] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCommentsSection, setShowCommentsSection] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleEngagement = async (type: 'like') => {
    if (!user) return;
    
    setIsEngaging(true);
    try {
      const result = await safeApiCall(
        () => fetch('/api/posts/engagement', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            postId: post.id,
            engagementType: type
          }),
        }),
        'Failed to update engagement'
      );

      if (result.success) {
        if (type === 'like') {
          setIsLiked(!isLiked);
          setLikes(prev => isLiked ? prev - 1 : prev + 1);
        }
        
        if (onEngagementChange) {
          onEngagementChange();
        }
      }
    } catch (error) {
      // Error handling
    } finally {
      setIsEngaging(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleDeletePost = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      const result = await safeApiCall(
        () => fetch(`/api/posts?postId=${post.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        'Failed to delete post'
      );

      if (result.success) {
        setShowDeleteDialog(false);
        setShowMenu(false);
        if (onPostDeleted) {
          onPostDeleted();
        }
      }
    } catch (error) {
      // Error handling
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteDialog(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const handleCommentCountChange = (newCount: number) => {
    setComments(newCount);
  };

  const handleToggleComments = () => {
    setShowCommentsSection(prev => !prev);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <Card className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div 
            className="relative cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                duration: 3000,
              })
            }}
          >
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
              {post.profile_photo_url ? (
                <img 
                  src={post.profile_photo_url} 
                  alt={post.user_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                getInitials(post.user_name)
              )}
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
              <Sparkles className="h-2 w-2 text-white" />
            </div>
          </div>
          
          <div 
            className="flex-1 cursor-pointer"
            onClick={() => {
              toast("This feature is enabled in Phase2/Version2", {
                duration: 3000,
              })
            }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{post.user_name}</h3>
              <div className="w-8 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">92</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">{post.profession || 'Professional'}</p>
            <p className="text-xs text-gray-400">{formatTimeAgo(post.published_at || post.created_at)}</p>
          </div>

          {/* Three dots menu - only show for current user's posts */}
          {user && user.id === post.user_id && (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMenuClick}
                className="h-8 w-8 p-0 hover:bg-gray-100"
              >
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={handleDeleteClick}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="text-gray-800 leading-relaxed">
          {post.content}
        </div>

        {/* Media */}
        {post.media && post.media.length > 0 ? (
          <div className="space-y-2">
            {post.media.map((media, index) => (
              <div key={media.id || index} className="rounded-lg overflow-hidden">
                {media.media_type === 'image' ? (
                  <img 
                    src={media.cloudinary_url} 
                    alt={media.file_name || 'Post image'}
                    className="w-full max-h-96 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : media.media_type === 'video' ? (
                  <video 
                    src={media.cloudinary_url} 
                    controls
                    className="w-full max-h-96 rounded-lg"
                  />
                ) : (
                  <div className="p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-600">{media.file_name}</p>
                    <a 
                      href={media.cloudinary_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Download
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Debug info when no media is found
          post.media === undefined && (
            <div className="text-xs text-gray-400 p-2 bg-gray-50 rounded">
              Debug: No media array found in post data
            </div>
          )
        )}

        {/* Engagement */}
        <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEngagement('like')}
            disabled={isEngaging}
            className={`flex items-center gap-2 ${
              isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likes}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleComments}
            className={`flex items-center gap-2 ${showCommentsSection ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'}`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{comments}</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showCommentsSection && (
          <CommentsSection 
            postId={post.id} 
            onCommentCountChange={handleCommentCountChange}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Delete Post
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this post? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleCancelDelete}
                  variant="outline"
                  className="px-6"
                  disabled={isDeleting}
                >
                  No
                </Button>
                <Button
                  onClick={handleDeletePost}
                  className="px-6 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Yes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
