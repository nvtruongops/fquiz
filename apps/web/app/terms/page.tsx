import type { Metadata } from 'next'
import { verifySession } from '@/lib/modules/auth/dal'
import AppLayout from '@/components/layout/AppLayout'
import { GsapStaggerContainer } from '@/components/shared/gsap/GsapStaggerContainer'
import { LegalTableOfContents } from '@/components/legal/LegalTableOfContents'
import { LegalDocumentContent } from '@/components/legal/LegalDocumentContent'
import { getLocalizedMetadata } from '@/lib/core/utils/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const localized = await getLocalizedMetadata('terms')
  const title = String(localized.title)
  const description = String(localized.description ?? '')
  return { title, description, openGraph: { title, description, type: 'website' } }
}

export default async function TermsPage() {
  const user = await verifySession()

  return (
    <AppLayout user={user ? { _id: user.userId, name: user.username, role: user.role, avatarUrl: user.avatarUrl } : null}>
      <main className="max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 md:px-8 space-y-6">
        <GsapStaggerContainer selector=".legal-section" stagger={0.08} y={16} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <LegalTableOfContents type="terms" />

          <LegalDocumentContent type="terms" />
        </GsapStaggerContainer>
      </main>
    </AppLayout>
  )
}
