import { LegalPage } from '@/components/LegalPage';
import { cguContent } from '@/content/legal/cgu';

export default function CguScreen() {
  return <LegalPage title="CGU" content={cguContent} />;
}
