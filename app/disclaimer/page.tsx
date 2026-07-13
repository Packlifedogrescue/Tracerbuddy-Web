import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Disclaimer — TracerBuddy',
  description: 'Important disclaimers regarding the use of TracerBuddy and its AI-powered features.',
  alternates: { canonical: '/disclaimer' },
}

export default function DisclaimerPage() {
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
          Disclaimer
        </h1>
        <p className="text-[15px] text-[#888]">Last updated: June 2026</p>
      </div>

      {/* Content */}
      <div className="px-6 md:px-12 pb-24 max-w-[800px] mx-auto">
        <div className="prose-custom space-y-10">

          <section>
            <h2>1. General Use</h2>
            <p>TracerBuddy LLC ("TracerBuddy", "we", "our", or "us") provides the TracerBuddy platform — including the website, iOS app, and Apple Watch app — as a golf performance tracking and analytics tool. By using the Service you acknowledge and agree to the disclaimers set out on this page.</p>
            <p>TracerBuddy is intended for recreational and informational use only. Nothing in the Service constitutes professional advice of any kind.</p>
          </section>

          <section>
            <h2>2. AI-Generated Content</h2>
            <p>TracerBuddy uses artificial intelligence technology provided by Anthropic (Claude) to generate coaching insights, caddie suggestions, round analysis, and other AI-powered features. You expressly acknowledge that:</p>
            <ul>
              <li>AI-generated suggestions are for <strong>reference and entertainment purposes only</strong> and do not constitute professional golf instruction.</li>
              <li>AI outputs may be inaccurate, incomplete, or not appropriate for your specific situation, skill level, or course conditions.</li>
              <li>TracerBuddy LLC is <strong>not responsible for any shot decisions, course management choices, or actions taken based on AI recommendations</strong>.</li>
              <li>AI coaching is not a substitute for instruction from a qualified, certified golf professional (PGA or equivalent).</li>
              <li>You assume full responsibility for all decisions made on the course, regardless of any suggestions provided by the Service.</li>
            </ul>
          </section>

          <section>
            <h2>3. GPS and Distance Accuracy</h2>
            <p>Distance measurements, yardage figures, and GPS-based features within the Service depend on your device's location hardware and third-party mapping data. TracerBuddy does not warrant that:</p>
            <ul>
              <li>GPS distances will be accurate to any particular tolerance.</li>
              <li>Tee, green, or hazard coordinates will match the actual course layout.</li>
              <li>Front, center, or back-of-green distances reflect current pin positions.</li>
            </ul>
            <p>Always verify distances using on-course markers, caddies, or a certified rangefinder where accuracy is critical. Do not rely solely on TracerBuddy for distance decisions.</p>
          </section>

          <section>
            <h2>4. Course and Scorecard Data</h2>
            <p>Course information, hole layouts, par values, handicap indexes, slope ratings, and yardages are sourced from third-party databases (including GolfAPI.io) and may not be current, complete, or accurate for every course. TracerBuddy is not responsible for errors or omissions in course data. Course layouts change — always defer to official course scorecards and signage.</p>
          </section>

          <section>
            <h2>5. Weather and Conditions Data</h2>
            <p>Playing conditions, wind speed, temperature, and precipitation data displayed in the Service are sourced from third-party weather providers and are provided for general reference only. Weather conditions can change rapidly and unexpectedly. TracerBuddy is not responsible for decisions made based on displayed weather data. Always follow the direction of golf course staff regarding weather safety, including lightning protocols.</p>
          </section>

          <section>
            <h2>6. Not a Substitute for Professional Instruction</h2>
            <p>TracerBuddy is a data and analytics platform. It does not employ golf professionals and does not provide personalised coaching. Swing analysis, putting insights, and performance recommendations generated by the Service are based on statistical patterns and AI modeling — they are not a replacement for in-person lessons with a certified golf instructor. Improper swing mechanics can cause injury. If you are experiencing pain or discomfort, stop playing and consult a medical professional.</p>
          </section>

          <section>
            <h2>7. Health and Safety</h2>
            <p>Golf is a physical activity that carries inherent risks including but not limited to muscle strain, joint injury, heat exhaustion, and being struck by golf balls or equipment. TracerBuddy accepts no responsibility for any injury, illness, or death arising from participation in golf or from use of the Service. Always warm up appropriately, stay hydrated, and follow safe golf practices.</p>
          </section>

          <section>
            <h2>8. Third-Party Links and Services</h2>
            <p>The Service may contain links to or integrations with third-party websites, apps, or services (including Mapbox, GolfAPI, Apple, Anthropic, and others). TracerBuddy is not responsible for the content, accuracy, or practices of any third-party service. Accessing third-party services is at your own risk and subject to those parties' own terms and policies.</p>
          </section>

          <section>
            <h2>9. No Warranty</h2>
            <p>The Service is provided on an "as is" and "as available" basis without any warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted, error-free, secure, or free of viruses or other harmful components.</p>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>To the fullest extent permitted by applicable law, TracerBuddy LLC, its officers, directors, employees, and agents shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages of any kind arising out of or in connection with your use of or inability to use the Service, including but not limited to:</p>
            <ul>
              <li>Decisions made based on AI coaching suggestions or caddie recommendations.</li>
              <li>Inaccurate GPS distances or course data.</li>
              <li>Injury or property damage occurring during a round of golf.</li>
              <li>Loss of data, round history, or account access.</li>
              <li>Service downtime or technical errors.</li>
            </ul>
            <p>In jurisdictions that do not allow the exclusion or limitation of incidental or consequential damages, our liability is limited to the maximum extent permitted by law.</p>
          </section>

          <section>
            <h2>11. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless TracerBuddy LLC and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in connection with your use of the Service, your violation of these disclaimers, or your violation of any rights of a third party.</p>
          </section>

          <section>
            <h2>12. Changes to This Disclaimer</h2>
            <p>We may update this Disclaimer from time to time. The "Last updated" date at the top of this page will reflect the most recent revision. Continued use of the Service after changes take effect constitutes your acceptance of the updated Disclaimer.</p>
          </section>

          <section>
            <h2>13. Contact</h2>
            <p>Questions about this Disclaimer? Contact us at <a href="mailto:legal@tracerbuddy.com">legal@tracerbuddy.com</a> or visit our <Link href="/contact">Contact page</Link>.</p>
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
            <Link href="/disclaimer" className="hover:text-black transition-colors">Disclaimer</Link>
            <Link href="/about" className="hover:text-black transition-colors">About</Link>
            <Link href="/contact" className="hover:text-black transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
