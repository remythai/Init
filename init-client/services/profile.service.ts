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
  // Récupérer le profil utilisateur
  async getUserProfile(): Promise<UserProfileData> {
    const response = await authService.authenticatedFetch('/api/users/me');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la récupération du profil');
    }

    // Extraction selon la structure de réponse
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

  // Récupérer le profil organisateur
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

  // Mettre à jour le profil utilisateur
  async updateUserProfile(updates: Partial<UserProfileData>): Promise<UserProfileData> {
    // Préparer les données pour l'API
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

    console.log('📝 Mise à jour du profil:', body);

    const response = await authService.authenticatedFetch('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la mise à jour du profil');
    }

    console.log('✅ Profil mis à jour');
    
    // Récupérer le profil complet après la mise à jour
    return await this.getUserProfile();
  }

  // Mettre à jour le profil organisateur
  async updateOrgaProfile(updates: Partial<OrgaProfileData>): Promise<OrgaProfileData> {
    const body: any = {};
    
    if (updates.nom) body.nom = updates.nom;
    if (updates.mail) body.mail = updates.mail;
    if (updates.tel !== undefined) body.tel = updates.tel;
    if (updates.description !== undefined) body.description = updates.description;

    console.log('📝 Mise à jour du profil orga:', body);

    const response = await authService.authenticatedFetch('/api/orga/me', {
      method: 'PUT',
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la mise à jour du profil');
    }

    console.log('✅ Profil orga mis à jour');
    
    return await this.getOrgaProfile();
  }

  // Récupérer un profil utilisateur par ID (pour voir d'autres profils)
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

  // Calculer l'âge à partir de la date de naissance
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