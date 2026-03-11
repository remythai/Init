import { LegalPage } from '@/components/LegalPage';
import { confidentialiteContent } from '@/content/legal/confidentialite';

export default function ConfidentialiteScreen() {
  return <LegalPage title="Politique de confidentialité" content={confidentialiteContent} />;
}
