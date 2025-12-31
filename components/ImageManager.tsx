'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, User, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ImageManagerProps {
  onImageUpdate?: (userData: any) => void;
}

const ImageManager: React.FC<ImageManagerProps> = ({ onImageUpdate }) => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [selectedProfileFile, setSelectedProfileFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profilePhoto' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }
      
      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'profilePhoto') {
          setProfilePhotoPreview(e.target?.result as string);
          setSelectedProfileFile(file);
        } else if (type === 'banner') {
          setBannerPreview(e.target?.result as string);
          setSelectedBannerFile(file);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (type: 'profilePhoto' | 'banner') => {
    const file = type === 'profilePhoto' ? selectedProfileFile : selectedBannerFile;
    
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(type === 'profilePhoto' ? 'profilePhoto' : 'banner', file);

      const response = await fetch(
        `/api/images/${type === 'profilePhoto' ? 'profile' : 'banner'}`,
        {
          method: 'PUT',
          body: formData,
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      
      // Update user context with new image data
      updateUser({
        ...user,
        profilePhotoUrl: type === 'profilePhoto' ? data.user.profilePhotoUrl : user.profilePhotoUrl,
        profilePhotoId: type === 'profilePhoto' ? data.user.profilePhotoId : user.profilePhotoId,
        bannerUrl: type === 'banner' ? data.user.bannerUrl : user.bannerUrl,
        bannerId: type === 'banner' ? data.user.bannerId : user.bannerId,
      });

      // Clear preview and file state
      if (type === 'profilePhoto') {
        setProfilePhotoPreview(null);
        setSelectedProfileFile(null);
      } else {
        setBannerPreview(null);
        setSelectedBannerFile(null);
      }

      toast.success('Image updated successfully!');
      
      // Call callback if provided
      if (onImageUpdate) {
        onImageUpdate(data.user);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'profilePhoto' | 'banner') => {
    if (!confirm(`Are you sure you want to delete your ${type === 'profilePhoto' ? 'profile photo' : 'banner'}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/images/${type === 'profilePhoto' ? 'profile' : 'banner'}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const data = await response.json();
      
      // Update user context
      updateUser({
        ...user,
        profilePhotoUrl: type === 'profilePhoto' ? null : user.profilePhotoUrl,
        profilePhotoId: type === 'profilePhoto' ? null : user.profilePhotoId,
        bannerUrl: type === 'banner' ? null : user.bannerUrl,
        bannerId: type === 'banner' ? null : user.bannerId,
      });

      toast.success(`${type === 'profilePhoto' ? 'Profile photo' : 'Banner'} deleted successfully!`);
      
      // Call callback if provided
      if (onImageUpdate) {
        onImageUpdate(data.user);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePreview = (type: 'profilePhoto' | 'banner') => {
    if (type === 'profilePhoto') {
      setProfilePhotoPreview(null);
      setSelectedProfileFile(null);
    } else {
      setBannerPreview(null);
      setSelectedBannerFile(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Profile Photo */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                {user?.profilePhotoUrl ? 'Current profile photo' : 'No profile photo set'}
              </p>
              {user?.profilePhotoUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete('profilePhoto')}
                  disabled={loading}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Upload New Profile Photo */}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'profilePhoto')}
              className="hidden"
              id="profile-photo-upload"
            />
            <label htmlFor="profile-photo-upload">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose New Photo
                </span>
              </Button>
            </label>
            
            {profilePhotoPreview && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="relative inline-block">
                  <img
                    src={profilePhotoPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemovePreview('profilePhoto')}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  onClick={() => handleUpload('profilePhoto')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Uploading...' : 'Upload Profile Photo'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Banner Image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Banner */}
          <div className="space-y-2">
            {user?.bannerUrl ? (
              <div className="relative">
                <img
                  src={user.bannerUrl}
                  alt="Banner"
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete('banner')}
                  disabled={loading}
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No banner image set</p>
                </div>
              </div>
            )}
          </div>

          {/* Upload New Banner */}
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(e, 'banner')}
              className="hidden"
              id="banner-upload"
            />
            <label htmlFor="banner-upload">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Choose New Banner
                </span>
              </Button>
            </label>
            
            {bannerPreview && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Preview:</p>
                <div className="relative">
                  <img
                    src={bannerPreview}
                    alt="Banner Preview"
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemovePreview('banner')}
                    className="absolute top-2 right-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => handleUpload('banner')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Uploading...' : 'Upload Banner'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageManager;
