import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — TracerBuddy',
  description: 'Terms governing your use of the TracerBuddy golf performance platform.',
}

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-[15px] text-[#888]">Last updated: May 2026</p>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 pb-24 max-w-[800px] mx-auto">
        <div className="prose-custom space-y-10">

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>By creating an account or using the TracerBuddy Service — including the website at tracerbuddy.com, the iOS app, and the Apple Watch app — you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service.</p>
            <p>We may update these Terms from time to time. Continued use of the Service after updates take effect constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>You must be at least 13 years old to use the Service. By using the Service, you represent that you meet this requirement.</p>
          </section>

          <section>
            <h2>3. Your Account</h2>
            <ul>
              <li>You are responsible for keeping your login credentials secure.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must provide accurate and complete information when registering.</li>
              <li>You may not share your account with others or create multiple accounts to circumvent restrictions.</li>
            </ul>
          </section>

          <section>
            <h2>4. Subscriptions and Billing</h2>
            <h3>4.1 Free Trial</h3>
            <p>New accounts receive access to full features for their first 2 rounds at no charge, without a credit card. After 2 rounds, a paid subscription is required to continue logging rounds.</p>

            <h3>4.2 Paid Subscriptions</h3>
            <p>Subscriptions are offered on a monthly ($24.99/month) or annual ($199.99/year) basis and are processed through Apple's in-app purchase system. By subscribing, you agree to Apple's payment terms.</p>

            <h3>4.3 Cancellation</h3>
            <p>You may cancel your subscription at any time through iPhone Settings → Apple ID → Subscriptions. Cancellation takes effect at the end of the current billing period. No refunds are provided for unused portions of a subscription period, except where required by applicable law.</p>

            <h3>4.4 Price Changes</h3>
            <p>We reserve the right to change subscription prices. We will give at least 30 days' notice of any price increases. Continued use after a price change takes effect constitutes acceptance of the new price.</p>
          </section>

          <section>
            <h2>5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any regulations.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its underlying infrastructure.</li>
              <li>Scrape, copy, or redistribute any part of the Service without written permission.</li>
              <li>Upload or transmit any harmful, offensive, or malicious content.</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service.</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service.</li>
            </ul>
          </section>

          <section>
            <h2>6. Your Content</h2>
            <p>You retain ownership of the data you input (round scores, shot data, notes). By submitting content to the Service, you grant us a worldwide, non-exclusive, royalty-free license to store, process, and display that content solely for the purpose of providing the Service to you.</p>
            <p>We may use anonymised, aggregated data (with no personally identifying information) to improve the Service and generate industry benchmarks.</p>
          </section>

          <section>
            <h2>7. Intellectual Property</h2>
            <p>All software, design, text, graphics, logos, and other content in the Service (excluding your content) are owned by TracerBuddy or its licensors and are protected by intellectual property laws. You may not reproduce or distribute any part of the Service without our prior written consent.</p>
          </section>

          <section>
            <h2>8. Third-Party Services</h2>
            <p>The Service integrates with third-party providers including Mapbox (course maps) and Apple (Watch connectivity, payments). Use of these integrations is subject to those providers' own terms and privacy policies. We are not responsible for third-party services.</p>
          </section>

          <section>
            <h2>9. Disclaimers</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that GPS and shot data will be 100% accurate. Course data is provided by third-party databases and may not always be up to date.</p>
            <p>TracerBuddy is a data and analytics tool. It does not provide professional golf instruction. AI coaching suggestions are for informational purposes only and are not a substitute for advice from a qualified golf professional.</p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, TracerBuddy and its affiliates, officers, and employees will not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, even if we have been advised of the possibility of such damages.</p>
            <p>Our total liability to you for any claims arising from these Terms or the Service is limited to the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2>11. Termination</h2>
            <p>We may suspend or terminate your account at any time if you violate these Terms or if we reasonably believe your use of the Service poses a risk to us or other users. You may delete your account at any time from your Profile settings.</p>
          </section>

          <section>
            <h2>12. Governing Law</h2>
            <p>These Terms are governed by the laws of the jurisdiction in which TracerBuddy operates, without regard to conflict-of-law principles. Any disputes will be resolved through binding arbitration or in the courts of that jurisdiction.</p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>Questions about these Terms? Email us at <a href="mailto:legal@tracerbuddy.com">legal@tracerbuddy.com</a> or visit our <Link href="/contact">Contact page</Link>.</p>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-10 max-w-[1400px] mx-auto border-t border-black/[0.06]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[12px] text-[#888]">© 2026 TracerBuddy. All rights reserved.</div>
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
