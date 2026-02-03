import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ConfidentialitePage() {
  const filePath = path.join(process.cwd(), 'content/legal/confidentialite.md');
  const content = fs.readFileSync(filePath, 'utf-8');

  return (
    <div className="min-h-screen bg-[#303030]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>

        <article className="prose prose-invert prose-lg max-w-none
          prose-headings:font-poppins prose-headings:text-white
          prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:font-bold prose-h1:mb-8
          prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-white/80 prose-p:font-roboto prose-p:leading-relaxed
          prose-li:text-white/80 prose-li:font-roboto
          prose-strong:text-white prose-strong:font-semibold
          prose-a:text-[#1271FF] prose-a:no-underline hover:prose-a:underline
          prose-hr:border-white/10 prose-hr:my-8
          prose-ul:space-y-2 prose-ol:space-y-2
        ">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
