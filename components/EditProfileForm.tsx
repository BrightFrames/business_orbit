"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, X } from "lucide-react"
import toast from 'react-hot-toast'

interface EditProfileFormProps {
  user: {
    id: number | string
    name: string
    profession?: string
    description?: string
    skills?: string[]
    interest?: string
    profilePhotoUrl?: string
    bannerUrl?: string
  }
  onCancel: () => void
  onSave: (updatedData: any) => void
}

export default function EditProfileForm({ user, onCancel, onSave }: EditProfileFormProps) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    profession: user.profession || '',
    description: user.description || '',
    skills: user.skills || [],
    interest: user.interest || '',
    profilePhotoUrl: user.profilePhotoUrl || '',
    bannerUrl: user.bannerUrl || ''
  })

  const [newSkill, setNewSkill] = useState('')
  const [uploading, setUploading] = useState({ profile: false, banner: false })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const uploadImage = async (file: File, type: 'profile' | 'banner') => {
    if (!file) return
    const allowedTypes = ['image/jpeg','image/jpg','image/png','image/gif','image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file')
      return
    }
    if (file.size > 5*1024*1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    try {
      setUploading(prev => ({...prev, [type]: true}))
      const form = new FormData()
      form.append(type === 'profile' ? 'profilePhoto' : 'banner', file)
      
      const res = await fetch(`/api/images/${type === 'profile' ? 'profile' : 'banner'}`, {
        method: 'PUT',
        body: form,
        credentials: 'include'
      })
      
      if (!res.ok) throw new Error('Upload failed')
      
      const data = await res.json()
      
      setFormData(prev => ({
        ...prev,
        profilePhotoUrl: type === 'profile' ? data.user.profilePhotoUrl : prev.profilePhotoUrl,
        bannerUrl: type === 'banner' ? data.user.bannerUrl : prev.bannerUrl,
      }))
      
      toast.success(`${type === 'profile' ? 'Profile photo' : 'Banner'} updated successfully!`)
    } catch (error) {
      toast.error(`Failed to upload ${type === 'profile' ? 'profile photo' : 'banner'}`)
    } finally {
      setUploading(prev => ({...prev, [type]: false}))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'banner') => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, type)
  }

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        profession: formData.profession,
        description: formData.description,
        skills: formData.skills,
        interest: formData.interest
      }
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      onSave(data.user)
      toast.success('Profile updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Banner Photo</h3>
        <div className="space-y-4">
          <div
            className="h-32 bg-muted rounded-lg relative overflow-hidden"
            style={{ 
              backgroundImage: formData.bannerUrl 
                ? `url("${formData.bannerUrl}")` 
                : `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23000000' fillOpacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <input 
              id="bannerInput" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleImageChange(e, 'banner')} 
            />
            <button
              disabled={uploading.banner}
              onClick={() => document.getElementById('bannerInput')?.click()}
              className="absolute inset-0 bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading.banner ? 'Uploading...' : 'Change Banner'}
            </button>
          </div>
        </div>
      </Card>

      {/* Profile Photo Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Profile Photo</h3>
        <div className="flex items-center space-x-4">
          <div className="relative">
            {formData.profilePhotoUrl ? (
              <img
                src={formData.profilePhotoUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                {formData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <input 
              id="profileInput" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleImageChange(e, 'profile')} 
            />
            <button
              disabled={uploading.profile}
              onClick={() => document.getElementById('profileInput')?.click()}
              className="absolute inset-0 bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
            >
              <Upload className="w-3 h-3" />
            </button>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => document.getElementById('profileInput')?.click()}
              disabled={uploading.profile}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading.profile ? 'Uploading...' : 'Change Photo'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Profession</label>
            <Input
              value={formData.profession}
              onChange={(e) => handleInputChange('profession', e.target.value)}
              placeholder="Enter your profession"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">About</label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell us about yourself"
              rows={4}
            />
          </div>
        </div>
      </Card>

      {/* Skills Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Skills</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {formData.skills.map((skill) => (
              <Badge key={skill} variant="outline" className="flex items-center gap-1">
                {skill}
                <button
                  onClick={() => removeSkill(skill)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex space-x-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill"
              onKeyPress={(e) => e.key === 'Enter' && addSkill()}
            />
            <Button onClick={addSkill} variant="outline">
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Interests Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Interests</h3>
        <Input
          value={formData.interest}
          onChange={(e) => handleInputChange('interest', e.target.value)}
          placeholder="Enter your interests"
        />
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4 pb-8">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
      </div>
    </div>
  )
}
