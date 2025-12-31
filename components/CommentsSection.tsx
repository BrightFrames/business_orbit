"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Reply, MoreVertical, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { safeApiCall } from "@/lib/utils/api";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_comment_id?: string;
  user_id: number;
  user_name: string;
  profile_photo_url?: string;
}

interface CommentsSectionProps {
  postId: string;
  onCommentCountChange?: (count: number) => void;
}

export default function CommentsSection({ postId, onCommentCountChange }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Fetch comments
  const fetchComments = async () => {
    setLoading(true);
    try {
      const result = await safeApiCall(
        () => fetch(`/api/posts/comments?postId=${postId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        }),
        'Failed to fetch comments'
      );

      if (result.success && result.data) {
        // Check if result.data is an array or wrapped in another object
        let commentsData;
        if (Array.isArray(result.data)) {
          commentsData = result.data;
        } else if (result.data && Array.isArray((result.data as any).data)) {
          commentsData = (result.data as any).data;
        } else {
          commentsData = [];
        }
        
        console.log('Processed comments data:', commentsData);
        setComments(commentsData as Comment[]);
        if (onCommentCountChange) {
          onCommentCountChange(commentsData.length);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create comment
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return;

    console.log('Creating comment:', { postId, content: newComment.trim(), user: user.id });
    setSubmitting(true);
    try {
      const result = await safeApiCall(
        () => fetch('/api/posts/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            postId,
            content: newComment.trim()
          }),
        }),
        'Failed to create comment'
      );

      console.log('Comment creation result:', result);

      if (result.success && result.data) {
        // Extract the actual comment data from the response
        let newCommentData;
        if (result.data && typeof result.data === 'object' && 'id' in result.data) {
          // Direct comment object
          newCommentData = result.data as Comment;
        } else if (result.data && (result.data as any).data && typeof (result.data as any).data === 'object') {
          // Wrapped in data property
          newCommentData = (result.data as any).data as Comment;
        } else {
          console.error('Unexpected comment data structure:', result.data);
          return;
        }
        
        console.log('New comment data:', newCommentData);
        setComments(prev => [...prev, newCommentData]);
        setNewComment("");
        if (onCommentCountChange) {
          onCommentCountChange(comments.length + 1);
        }
      } else {
        console.error('Comment creation failed:', result.error);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Create reply
  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !user) return;

    console.log('Creating reply:', { postId, content: replyContent.trim(), parentCommentId, user: user.id });
    setSubmitting(true);
    try {
      const result = await safeApiCall(
        () => fetch('/api/posts/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            postId,
            content: replyContent.trim(),
            parentCommentId
          }),
        }),
        'Failed to create reply'
      );

      console.log('Reply creation result:', result);

      if (result.success && result.data) {
        // Extract the actual reply data from the response
        let newReply;
        if (result.data && typeof result.data === 'object' && 'id' in result.data) {
          // Direct comment object
          newReply = result.data as Comment;
        } else if (result.data && (result.data as any).data && typeof (result.data as any).data === 'object') {
          // Wrapped in data property
          newReply = (result.data as any).data as Comment;
        } else {
          console.error('Unexpected reply data structure:', result.data);
          return;
        }
        
        console.log('New reply data:', newReply);
        setComments(prev => [...prev, newReply]);
        setReplyContent("");
        setReplyingTo(null);
        if (onCommentCountChange) {
          onCommentCountChange(comments.length + 1);
        }
      } else {
        console.error('Reply creation failed:', result.error);
      }
    } catch (error) {
      console.error('Error creating reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const result = await safeApiCall(
        () => fetch(`/api/posts/comments/${commentId}`, {
          method: 'DELETE',
          credentials: 'include',
        }),
        'Failed to delete comment'
      );

      if (result.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        if (onCommentCountChange) {
          onCommentCountChange(comments.length - 1);
        }
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string | undefined | null) => {
    if (!dateString) {
      return 'Unknown time';
    }
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${Math.max(0, diffInMinutes)}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.max(0, diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${Math.max(0, diffInDays)}d ago`;
    }
  };

  // Get initials
  const getInitials = (name: string | undefined | null) => {
    if (!name || typeof name !== 'string') {
      return 'U'; // Default for unknown user
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Organize comments into threads
  const organizeComments = (comments: Comment[]) => {
    // Ensure comments is an array
    if (!Array.isArray(comments)) {
      return [];
    }

    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    // Create map with replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Organize into threads
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(commentMap.get(comment.id)!);
      }
    });

    return rootComments;
  };

  // Load comments when component mounts
  useEffect(() => {
    console.log('CommentsSection - Fetching comments for post:', postId);
    fetchComments();
  }, [postId]);

  // Debug logging
  useEffect(() => {
    console.log('CommentsSection - Comments state:', comments);
    console.log('CommentsSection - Comments type:', typeof comments);
    console.log('CommentsSection - Is array:', Array.isArray(comments));
  }, [comments]);

  const organizedComments = organizeComments(Array.isArray(comments) ? comments : []);

  return (
    <div className="border-t border-gray-100 pt-4">
      {/* Comments Section */}
        <div className="space-y-4">
          {/* New Comment Input */}
          {user && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                {user.profilePhotoUrl ? (
                  <img 
                    src={user.profilePhotoUrl} 
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  getInitials(user.name)
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px] resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewComment("")}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    className="bg-black hover:bg-gray-800"
                  >
                    {submitting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Comments List */}
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {organizedComments.map((comment, index) => (
                <div key={`comment-${comment.id}-${index}`} className="space-y-3">
                  {/* Main Comment */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                      {comment.profile_photo_url ? (
                        <img 
                          src={comment.profile_photo_url} 
                          alt={comment.user_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(comment.user_name)
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">{comment.user_name || 'Unknown User'}</span>
                          <span className="text-xs text-gray-500">{formatTimeAgo(comment.created_at)}</span>
                          {user && user.id === comment.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{comment.content || 'No content'}</p>
                      </div>
                      
                      {/* Reply Button */}
                      {user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="text-xs text-gray-500 hover:text-blue-500 mt-1"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Reply
                        </Button>
                      )}

                      {/* Reply Input */}
                      {replyingTo === comment.id && user && (
                        <div className="mt-3 ml-4 space-y-2">
                          <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                              {user.profilePhotoUrl ? (
                                <img 
                                  src={user.profilePhotoUrl} 
                                  alt={user.name || 'User'}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                getInitials(user.name)
                              )}
                            </div>
                            <div className="flex-1">
                              <Textarea
                                placeholder={`Reply to ${comment.user_name}...`}
                                value={replyContent}
                                onChange={(e) => setReplyContent(e.target.value)}
                                className="min-h-[60px] resize-none text-sm"
                                maxLength={1000}
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyContent("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitReply(comment.id)}
                                  disabled={!replyContent.trim() || submitting}
                                  className="bg-black hover:bg-gray-800"
                                >
                                  {submitting ? "Posting..." : "Reply"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="ml-8 space-y-3">
                      {comment.replies.map((reply, replyIndex) => (
                        <div key={`reply-${reply.id}-${replyIndex}`} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                            {reply.profile_photo_url ? (
                              <img 
                                src={reply.profile_photo_url} 
                                alt={reply.user_name}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              getInitials(reply.user_name)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-gray-900">{reply.user_name || 'Unknown User'}</span>
                                <span className="text-xs text-gray-500">{formatTimeAgo(reply.created_at)}</span>
                                {user && user.id === reply.user_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteComment(reply.id)}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-gray-800">{reply.content || 'No content'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {organizedComments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
}
