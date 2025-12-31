'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Phone, Lock, Eye, EyeOff, Upload, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AuthFormProps {
  mode?: 'signin' | 'signup';
  setMode?: (mode: 'signin' | 'signup') => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode = 'signin', setMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    description: '',
    profession: '',
    interest: '',
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();



  const availableSkills = [
    'Backend Development',
    'Business Development',
    'Cloud Computing',
    'Communication & Public Speaking',
    'Content Writing & Copywriting',
    'Customer Relationship Management (CRM)',
    'Cybersecurity',
    'Data Science & Analytics',
    'DevOps / CI-CD',
    'Digital Marketing',
    'Entrepreneurship & Startups',
    'Finance & Accounting',
    'Frontend Development',
    'Full Stack Web Development',
    'Game Development',
    'Graphic Design',
    'Human Resource Management',
    'Leadership & Team Management',
    'Machine Learning / AI',
    'Mobile App Development',
    'Product Management',
    'Project Management',
    'Sales & Marketing',
    'SEO / SEM Optimization',
    'Software Testing & QA',
    'UI/UX Design',
    'Video Editing & Content Creation'
  ];

  const professionOptions = [
    'AI Ethics Specialist',
    'AI Researcher',
    'Blockchain Architect',
    'Blockchain Consultant',
    'Business Analyst',
    'CEO',
    'CFO',
    'Chief Architect',
    'Chief Innovation Officer',
    'Chief Technology Officer',
    'Chief officer',
    'Cloud Architect',
    'Co-Founder',
    'CTO',
    'Data Scientist',
    'DevOps Engineer',
    'Devops Consultant',
    'Director of AI Research',
    'Director of Architect',
    'Director of Operations',
    'Director of Research',
    'Enterprise Architect',
    'Founder',
    'Full Stack Developer',
    'Lead UX Designer',
    'Manager',
    'Principal Engineer',
    'Principal Researcher',
    'Principal Scientist',
    'Product Designer',
    'Project Director',
    'Quantum Computing Lead',
    'Scrum Master',
    'Senior Consultant',
    'Senior Data Analyst',
    'Senior Product Manager',
    'Software Engineer',
    'UX Designer',
    'VP of Engineering',
    'VP of Marketing'
  ];
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSelectedSkills(selectedSkills.filter(skill => skill !== skillToRemove));
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBanner(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setBannerPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveProfilePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
  };

  const handleRemoveBanner = () => {
    setBanner(null);
    setBannerPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signin') {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        return;
      } else if (result.error === 'EMAIL_NOT_REGISTERED') {
        toast.error('Email not registered. Please create a new account.', {
          duration: 5000
        });
      }
    } else {
      if (formData.password !== formData.confirmPassword) {
        alert('Passwords do not match');
        setLoading(false);
        return;
      }

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('phone', formData.phone);
      submitData.append('password', formData.password);
      submitData.append('confirmPassword', formData.confirmPassword);
      submitData.append('description', formData.description);
      submitData.append('profession', formData.profession);
      submitData.append('interest', formData.interest);
      submitData.append('skills', JSON.stringify(selectedSkills));

      if (profilePhoto) {
        submitData.append('profilePhoto', profilePhoto);
      }
      if (banner) {
        submitData.append('banner', banner);
      }

      const result = await signup(submitData);
      if (result.success) {
        return;
      }
    }
    
    setLoading(false);
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  const isSignIn = mode === 'signin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="text-gray-600">
          {isSignIn ? 'Sign in to your account' : 'Join Business Orbit and start connecting'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormFields
          mode={mode}
          formData={formData}
          showPassword={showPassword}
          showConfirmPassword={showConfirmPassword}
          onFieldChange={handleChange}
          onTogglePassword={() => setShowPassword(!showPassword)}
          onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {/* Row 3: Skills & Interest (2 items in a row) - only for signup */}
        {!isSignIn && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                Skills
              </label>
              <div className="space-y-3">
                {/* Skills dropdown */}
                <div className="relative">
                  <select
                    id="skills"
                    name="skills"
                    value={selectedSkills.length > 0 ? selectedSkills[0] : ''}
                    onChange={(e) => {
                      if (e.target.value && !selectedSkills.includes(e.target.value)) {
                        setSelectedSkills([...selectedSkills, e.target.value]);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 appearance-none bg-white cursor-pointer text-black"
                    style={{
                      colorScheme: 'light',
                      backgroundColor: 'white',
                      color: 'black'
                    }}
                  >
                    <option value="">Select a skill</option>
                    {availableSkills.map((skill) => (
                      <option key={skill} value={skill} disabled={selectedSkills.includes(skill)}>
                        {skill}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-1">
                Interest
              </label>
              <input
                type="text"
                id="interest"
                name="interest"
                value={formData.interest}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="Enter your interests"
              />
            </div>
          </div>
        )}

        {/* Selected skills display - only for signup */}
        {!isSignIn && selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-gray-500 hover:text-red-500 transition-colors duration-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Row 4: Profession (full width) - only for signup */}
        {!isSignIn && (
          <div>
            <label htmlFor="profession" className="block text-sm font-medium text-gray-700 mb-1">
              Profession
            </label>
            <div className="relative">
              <select
                id="profession"
                name="profession"
                value={formData.profession}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 appearance-none bg-white cursor-pointer text-black"
                style={{
                  colorScheme: 'light',
                  backgroundColor: 'white',
                  color: 'black'
                }}
              >
                <option value="">Select your profession</option>
                {professionOptions.map((profession) => (
                  <option key={profession} value={profession}>
                    {profession}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Profile Description field - only for signup */}
        {!isSignIn && (
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Profile Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>
        )}

        {/* File upload section - only for signup */}
        {!isSignIn && (
          <FileUploadSection
            profilePhoto={profilePhoto}
            banner={banner}
            profilePhotoPreview={profilePhotoPreview}
            bannerPreview={bannerPreview}
            onProfilePhotoChange={handleProfilePhotoChange}
            onBannerChange={handleBannerChange}
            onRemoveProfilePhoto={handleRemoveProfilePhoto}
            onRemoveBanner={handleRemoveBanner}
          />
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
        >
          {loading ? 'Please wait...' : (isSignIn ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      {/* OAuth buttons - only for signin */}
      {isSignIn && <OAuthButtons onOAuthLogin={handleOAuthLogin} />}

    </div>
  );
};

// Form Fields Component (consolidated from auth/FormFields.tsx)
interface FormFieldsProps {
  mode: 'signin' | 'signup';
  formData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    profession: string;
    interest: string;
  };
  showPassword: boolean;
  showConfirmPassword: boolean;
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
}

export const FormFields: React.FC<FormFieldsProps> = ({
  mode,
  formData,
  showPassword,
  showConfirmPassword,
  onFieldChange,
  onTogglePassword,
  onToggleConfirmPassword,
}) => {
  const isSignIn = mode === 'signin';

  return (
    <>
      {/* Row 1: Name, Email, Phone (3 items) - only for signup */}
      {!isSignIn ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={onFieldChange}
                required
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="Enter your full name"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={onFieldChange}
                required
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="Enter your email"
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={onFieldChange}
                required
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </div>
      ) : (
        // For signin, only show email
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={onFieldChange}
              required
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
              placeholder="Enter your email"
            />
          </div>
        </div>
      )}

      {/* Row 2: Password, Confirm Password (2 items) */}
      {isSignIn ? (
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={onFieldChange}
              required
              className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={onFieldChange}
                required
                className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={onFieldChange}
                required
                className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={onToggleConfirmPassword}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// OAuth Buttons Component (consolidated from auth/OAuthButtons.tsx)
interface OAuthButtonsProps {
  onOAuthLogin: (provider: string) => void;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({ onOAuthLogin }) => {
  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onOAuthLogin('google')}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="ml-2">Google</span>
        </button>

        <button
          type="button"
          onClick={() => onOAuthLogin('linkedin')}
          className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0077B5">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span className="ml-2">LinkedIn</span>
        </button>
      </div>
    </div>
  );
};

// File Upload Section Component (consolidated from auth/FileUploadSection.tsx)
interface FileUploadSectionProps {
  profilePhoto: File | null;
  banner: File | null;
  profilePhotoPreview: string | null;
  bannerPreview: string | null;
  onProfilePhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveProfilePhoto: () => void;
  onRemoveBanner: () => void;
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  profilePhoto,
  banner,
  profilePhotoPreview,
  bannerPreview,
  onProfilePhotoChange,
  onBannerChange,
  onRemoveProfilePhoto,
  onRemoveBanner,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Profile Photo Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Profile Photo
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              {profilePhotoPreview ? (
                <img
                  src={profilePhotoPreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
            </div>
            {profilePhoto && (
              <button
                type="button"
                onClick={onRemoveProfilePhoto}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div>
            <input
              type="file"
              id="profilePhoto"
              accept="image/*"
              onChange={onProfilePhotoChange}
              className="hidden"
            />
            <label
              htmlFor="profilePhoto"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Photo
            </label>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG up to 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Banner Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Banner Image
        </label>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-32 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {bannerPreview ? (
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Upload className="w-6 h-6 text-gray-400" />
              )}
            </div>
            {banner && (
              <button
                type="button"
                onClick={onRemoveBanner}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div>
            <input
              type="file"
              id="banner"
              accept="image/*"
              onChange={onBannerChange}
              className="hidden"
            />
            <label
              htmlFor="banner"
              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Banner
            </label>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG up to 5MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AuthForm;


