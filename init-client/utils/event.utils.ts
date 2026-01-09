// utils/event.utils.ts
import { Event } from '@/components/EventsList';
import { EventResponse } from '@/services/event.service';

const inferTheme = (name: string, description?: string): string => {
  const text = `${name} ${description || ''}`.toLowerCase();
  
  if (text.includes('jazz') || text.includes('concert') || text.includes('musique')) {
    return 'musique';
  }
  if (text.includes('networking') || text.includes('startup') || text.includes('professionnel')) {
    return 'professionnel';
  }
  if (text.includes('étudiant') || text.includes('campus') || text.includes('université')) {
    return 'étudiant';
  }
  if (text.includes('sport') || text.includes('football') || text.includes('match')) {
    return 'sport';
  }
  if (text.includes('café') || text.includes('brunch') || text.includes('coffee')) {
    return 'café';
  }
  if (text.includes('fête') || text.includes('soirée') || text.includes('party')) {
    return 'fête';
  }
  
  return 'professionnel';
};

export const formatEventDate = (isoDate: string): string => {
  if (!isoDate) {
    return 'Date non définie';
  }
  
  try {
    const date = new Date(isoDate);
    
    if (isNaN(date.getTime())) {
      console.error('Date invalide:', isoDate);
      return 'Date invalide';
    }
    
    const day = date.getDate();
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day} ${month} ${year}, ${hours}h${minutes}`;
  } catch (error) {
    console.error('Erreur formatage date:', error);
    return 'Date invalide';
  }
};

const getDefaultImage = (theme: string): string => {
  const images: Record<string, string> = {
    musique: 'https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=800',
    professionnel: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
    étudiant: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800',
    sport: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800',
    café: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
    fête: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  };
  return images[theme] || images.professionnel;
};

export const transformEventResponse = (eventResponse: EventResponse): Event => {
  const dateToFormat = eventResponse.start_at || eventResponse.event_date;
  
  console.log('📅 Date reçue:', dateToFormat);
  console.log('📝 is_registered reçu:', eventResponse.is_registered);
  console.log('📋 custom_fields reçu:', eventResponse.custom_fields);
  
  const theme = inferTheme(eventResponse.name, eventResponse.description);
  
  const participantCount = typeof eventResponse.participant_count === 'string' 
    ? parseInt(eventResponse.participant_count, 10) 
    : (eventResponse.participant_count || 0);
  
  return {
    id: eventResponse.id.toString(),
    name: eventResponse.name,
    theme: theme,
    date: dateToFormat ? formatEventDate(dateToFormat) : 'Date à venir',
    location: eventResponse.location,
    participants: participantCount,
    maxParticipants: eventResponse.max_participants,
    image: getDefaultImage(theme),
    description: eventResponse.description,
    isRegistered: eventResponse.is_registered || false,
    customFields: eventResponse.custom_fields || [],
  };
};

export const transformEventResponses = (events: EventResponse[]): Event[] => {
  return events.map(transformEventResponse);
};