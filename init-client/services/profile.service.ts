import { authService } from './auth.service';

export interface UserProfileData {
  id: number;
  firstname: string;
  lastname: string;
  tel: string;
  mail?: string;
  birthday: string;
  bio?: string;
  interests?: string[];
  personalityQuestions?: {
    question: string;
    answer: string;
  }[];
}

export interface OrgaProfileData {
  id: number;
  nom: string;
  mail: string;
  tel?: string;
  description?: string;
}

class ProfileService {
  async getUserProfile(): Promise<UserProfileData> {
    const response = await authService.authenticatedFetch('/api/users/me');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la récupération du profil');
    }

    const profile = data.data || data;
    
    return {
      id: profile.id,
      firstname: profile.firstname,
      lastname: profile.lastname,
      tel: profile.tel,
      mail: profile.mail,
      birthday: profile.birthday,
      bio: profile.bio || '',
      interests: profile.interests ? JSON.parse(profile.interests) : [],
      personalityQuestions: profile.personality_questions 
        ? JSON.parse(profile.personality_questions) 
        : []
    };
  }

  async getOrgaProfile(): Promise<OrgaProfileData> {
    const response = await authService.authenticatedFetch('/api/orga/me');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la récupération du profil');
    }

    const profile = data.data || data;
    
    return {
      id: profile.id,
      nom: profile.nom,
      mail: profile.mail,
      tel: profile.tel,
      description: profile.description
    };
  }

  async updateUserProfile(updates: Partial<UserProfileData>): Promise<UserProfileData> {
    const body: any = {};
    
    if (updates.firstname) body.firstname = updates.firstname;
    if (updates.lastname) body.lastname = updates.lastname;
    if (updates.tel) body.tel = updates.tel;
    if (updates.mail !== undefined) body.mail = updates.mail;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (updates.interests !== undefined) body.interests = JSON.stringify(updates.interests);
    if (updates.personalityQuestions !== undefined) {
      body.personality_questions = JSON.stringify(updates.personalityQuestions);
    }

    console.log('Mise à jour du profil:', body);

    const response = await authService.authenticatedFetch('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la mise à jour du profil');
    }

    console.log('Profil mis à jour');
    
    return await this.getUserProfile();
  }

  async updateOrgaProfile(updates: Partial<OrgaProfileData>): Promise<OrgaProfileData> {
    const body: any = {};
    
    if (updates.nom) body.nom = updates.nom;
    if (updates.mail) body.mail = updates.mail;
    if (updates.tel !== undefined) body.tel = updates.tel;
    if (updates.description !== undefined) body.description = updates.description;

    console.log('Mise à jour du profil orga:', body);

    const response = await authService.authenticatedFetch('/api/orga/me', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la mise à jour du profil');
    }

    console.log('Profil orga mis à jour');
    
    return await this.getOrgaProfile();
  }

  async getUserProfileById(userId: number): Promise<UserProfileData> {
    const response = await authService.authenticatedFetch(`/api/users/${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la récupération du profil');
    }

    const profile = data.data || data;
    
    return {
      id: profile.id,
      firstname: profile.firstname,
      lastname: profile.lastname,
      tel: profile.tel,
      mail: profile.mail,
      birthday: profile.birthday,
      bio: profile.bio || '',
      interests: profile.interests ? JSON.parse(profile.interests) : [],
      personalityQuestions: profile.personality_questions 
        ? JSON.parse(profile.personality_questions) 
        : []
    };
  }

  calculateAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}

export const profileService = new ProfileService();