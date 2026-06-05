import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — TracerBuddy',
  description: 'How TracerBuddy collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <div className="bg-[#F5EFE0] text-[#1A1A1A] min-h-screen font-sans">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#F5EFE0] border-b border-black/[0.04]">
        <div className="flex items-center justify-between px-6 md:px-12 py-4 max-w-[1400px] mx-auto">
          <Link href="/" className="flex items-center">
            <img src="/images/logo-horizontal.png" alt="TracerBuddy" className="h-16 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-[14px] text-[#1A1A1A] hidden md:block hover:text-black transition-colors">Sign In</Link>
            <Link href="/auth/signup" className="text-[14px] font-semibold bg-[#1A1A1A] text-[#F5EFE0] px-5 py-2.5 rounded-full hover:bg-black transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="px-6 md:px-12 py-16 max-w-[800px] mx-auto">
        <div className="text-[11px] font-bold text-[#DF9905] tracking-[0.25em] mb-4">LEGAL</div>
        <h1 className="font-serif text-[40px] md:text-[56px] font-medium tracking-[-0.025em] leading-[1.05] mb-4">
          Privacy Policy
        </h1>
        <p className="text-[15px] text-[#888]">Last updated: May 2026</p>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 pb-24 max-w-[800px] mx-auto">
        <div className="prose-custom space-y-10">

          <section>
            <h2>1. Who We Are</h2>
            <p>TracerBuddy ("we", "our", or "us") is a golf performance platform. We operate the website at tracerbuddy.app (also accessible at tracerbuddy.com) and the TracerBuddy iOS and Apple Watch applications (collectively, the "Service").</p>
            <p>If you have questions about this policy, contact us at <a href="mailto:privacy@tracerbuddy.com">privacy@tracerbuddy.com</a>.</p>
          </section>

          <section>
            <h2>2. Information We Collect</h2>
            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account data:</strong> name, email address, and password when you register.</li>
              <li><strong>Profile data:</strong> handicap index, home course, units preference, and display name.</li>
              <li><strong>Round data:</strong> scorecards, shot positions, club selections, distances, and notes you enter during or after a round.</li>
              <li><strong>Communications:</strong> messages you send to our support team.</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Device data:</strong> device model, operating system version, and app version.</li>
              <li><strong>Usage data:</strong> features accessed, pages viewed, and in-app events (via privacy-respecting analytics).</li>
              <li><strong>Location data:</strong> GPS coordinates during an active round, used solely to calculate shot distances and provide course maps. We do not track your location outside of active rounds.</li>
              <li><strong>Motion data (Apple Watch):</strong> accelerometer and gyroscope data captured during swing detection. This data is processed to derive swing speed and tempo — raw sensor data is not stored.</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <ul>
              <li>To provide, operate, and improve the Service.</li>
              <li>To process your subscription and manage billing through Apple's in-app purchase system.</li>
              <li>To generate round analysis, AI coaching insights, and performance stats.</li>
              <li>To send important service notifications (e.g., subscription renewal, security alerts). We do not send marketing emails without explicit consent.</li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2>4. Sharing Your Information</h2>
            <p>We do not sell your personal data. We share data only in the following circumstances:</p>
            <ul>
              <li><strong>Service providers:</strong> trusted third parties that help us operate the Service (e.g., Supabase for database hosting, Apple Maps for course maps, Apple for in-app purchases). These providers are contractually bound to protect your data.</li>
              <li><strong>AI provider:</strong> AI-generated coaching insights, round analysis, and caddie suggestions are powered by Anthropic (Claude). Relevant round statistics and performance data are sent to Anthropic's API to generate these insights. Anthropic's privacy policy is available at <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">anthropic.com/privacy</a>. We do not share your name, email, or account credentials with Anthropic.</li>
              <li><strong>Buddy Battles:</strong> when you connect with another TracerBuddy user, your display name and selected stats are visible to that user. You control what you share.</li>
              <li><strong>Legal requirements:</strong> if required by law, court order, or to protect the rights and safety of our users or the public.</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it by law or for legitimate business purposes (such as fraud prevention records).</p>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>Depending on your location, you may have rights including:</p>
            <ul>
              <li>Access to the personal data we hold about you.</li>
              <li>Correction of inaccurate data.</li>
              <li>Deletion of your account and data.</li>
              <li>Data portability (export of your round history in a machine-readable format).</li>
              <li>Objection to or restriction of certain processing.</li>
            </ul>
            <p>To exercise these rights, email <a href="mailto:privacy@tracerbuddy.com">privacy@tracerbuddy.com</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2>7. Security</h2>
            <p>We use industry-standard safeguards including encrypted connections (HTTPS/TLS), encrypted data storage, and role-based access controls. No system is 100% secure, but we take the protection of your data seriously and review our security practices regularly.</p>
          </section>

          <section>
            <h2>8. Children</h2>
            <p>The Service is not directed at children under 13. We do not knowingly collect personal data from children under 13. If you believe a child under 13 has provided us with personal data, please contact us and we will delete it.</p>
          </section>

          <section>
            <h2>9. Changes to This Policy</h2>
            <p>We may update this policy from time to time. We will notify you of significant changes by posting a notice in the app or sending an email to the address associated with your account. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>Questions or concerns? Reach us at <a href="mailto:privacy@tracerbuddy.com">privacy@tracerbuddy.com</a>.</p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-10 max-w-[1400px] mx-auto border-t border-black/[0.06]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-[#888]">© 2026 TracerBuddy LLC. All rights reserved.</div>
          <div className="flex items-center gap-6 text-[12px] text-[#888]">
            <Link href="/privacy" className="hover:text-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-black transition-colors">Terms</Link>
            <Link href="/about" className="hover:text-black transition-colors">About</Link>
            <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
