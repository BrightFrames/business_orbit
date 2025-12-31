// Types for user profile and groups
export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  bannerUrl?: string;
  skills: string[];
  description?: string;
  profession?: string;
  interest?: string;
  createdAt: string;
}

export interface UserGroup {
  name: string;
  type: 'chapter' | 'secret';
  members: number;
}

export interface UserPreferences {
  chapters: string[];
  secretGroups: string[];
}

export interface ProfileApiResponse {
  user: UserProfile;
  groups: UserPreferences;
}


