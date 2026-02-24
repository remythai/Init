// utils/event.utils.ts
import { Event } from '@/components/EventsList';
import { EventResponse } from '@/services/event.service';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const inferTheme = (name: string, description?: string): string => {
  const text = `${name} ${description || ''}`.toLowerCase();

  if (text.includes('jazz') || text.includes('concert') || text.includes('musique')) return 'musique';
  if (text.includes('networking') || text.includes('startup') || text.includes('professionnel')) return 'professionnel';
  if (text.includes('étudiant') || text.includes('campus') || text.includes('université')) return 'étudiant';
  if (text.includes('sport') || text.includes('football') || text.includes('match')) return 'sport';
  if (text.includes('café') || text.includes('brunch') || text.includes('coffee')) return 'café';
  if (text.includes('fête') || text.includes('soirée') || text.includes('party')) return 'fête';

  return 'professionnel';
};

export const formatEventDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return 'Date à confirmer';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return 'Date invalide';
    const day = date.getDate();
    const monthNames = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}h${minutes}`;
  } catch {
    return 'Date invalide';
  }
};

export const formatEventDateRange = (
  startAt: string | null | undefined,
  endAt: string | null | undefined
): string => {
  if (!startAt) return 'Date à confirmer';
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const formatTime = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (end && start.toDateString() === end.toDateString()) {
    return `${formatDate(start)}, ${formatTime(start)} - ${formatTime(end)}`;
  }
  if (end) {
    return `Du ${formatDate(start)} à ${formatTime(start)} au ${formatDate(end)} à ${formatTime(end)}`;
  }
  return `${formatDate(start)} à ${formatTime(start)}`;
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
  const theme = eventResponse.theme || inferTheme(eventResponse.name, eventResponse.description);
  const hasPhysicalEvent = !!(eventResponse.start_at || eventResponse.location);

  const image = eventResponse.banner_path
    ? `${API_URL}${eventResponse.banner_path}`
    : getDefaultImage(theme);

  const orgaLogo = eventResponse.orga_logo
    ? `${API_URL}${eventResponse.orga_logo}`
    : undefined;

  const participantCount =
    typeof eventResponse.participant_count === 'string'
      ? parseInt(eventResponse.participant_count, 10)
      : eventResponse.participant_count || 0;

  return {
    id: eventResponse.id.toString(),
    name: eventResponse.name,
    theme,
    physicalDate: formatEventDateRange(eventResponse.start_at, eventResponse.end_at),
    startAt: eventResponse.start_at || undefined,
    endAt: eventResponse.end_at || undefined,
    location: eventResponse.location || undefined,
    hasPhysicalEvent,
    appDate: formatEventDateRange(eventResponse.app_start_at, eventResponse.app_end_at),
    appStartAt: eventResponse.app_start_at || '',
    appEndAt: eventResponse.app_end_at || '',
    participants: participantCount,
    maxParticipants: eventResponse.max_participants,
    image,
    description: eventResponse.description,
    isRegistered: eventResponse.is_registered || false,
    isBlocked: eventResponse.is_blocked || false,
    customFields: eventResponse.custom_fields || [],
    orgaName: eventResponse.orga_name,
    orgaLogo,
    hasWhitelist: eventResponse.has_whitelist,
    bannerPath: eventResponse.banner_path,
  };
};

export const transformEventResponses = (events: EventResponse[]): Event[] => {
  return events.map(transformEventResponse);
};