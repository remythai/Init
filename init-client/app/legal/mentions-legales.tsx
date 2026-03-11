import { LegalPage } from '@/components/LegalPage';
import { mentionsLegalesContent } from '@/content/legal/mentions-legales';

export default function MentionsLegalesScreen() {
  return <LegalPage title="Mentions légales" content={mentionsLegalesContent} />;
}
