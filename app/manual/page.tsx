'use client'
import { useEffect } from 'react'

const MANUAL_CSS = `
  :root {
    --cream: #faf6ef;
    --ink: #16150f;
    --ink-soft: #35342b;
    --forest: #0d2818;
    --forest-soft: #163524;
    --gold: #b8924a;
    --gold-strong: #96762f;
    --muted: #7a7568;
    --card: #ffffff;
    --line: #e4ddc8;
    --line-strong: #d3c9ab;
    --code-bg: #f1ecdd;
    --shadow: 0 1px 2px rgba(22,21,15,0.04), 0 8px 24px -12px rgba(22,21,15,0.10);
    --radius: 10px;
    --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, "SF Mono", "Menlo", "Cascadia Code", monospace;
  }

  .manual-root[data-theme="dark"] {
    --cream: #121309;
    --ink: #ece6d6;
    --ink-soft: #c9c2ac;
    --forest: #0a2015;
    --forest-soft: #14311f;
    --gold: #d3ac5e;
    --gold-strong: #e6c179;
    --muted: #948d78;
    --card: #1b1c14;
    --line: #302f22;
    --line-strong: #423f2c;
    --code-bg: #201f15;
    --shadow: 0 1px 2px rgba(0,0,0,0.3), 0 12px 28px -14px rgba(0,0,0,0.55);
  }

  .manual-root { background: var(--cream); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; min-height: 100vh; }
  .manual-root * { box-sizing: border-box; }
  .manual-root ::selection { background: var(--gold); color: var(--forest); }
  .manual-root a { color: var(--gold-strong); }
  .manual-root a:focus-visible, .manual-root button:focus-visible, .manual-root .navlink:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .manual-root h1, .manual-root h2, .manual-root h3, .manual-root h4 { font-family: var(--serif); font-weight: 600; text-wrap: balance; color: var(--ink); }
  .manual-root code, .manual-root .mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }

  .manual-root .shell {
    display: grid;
    grid-template-columns: 260px minmax(0, 760px);
    justify-content: center;
    gap: 56px;
    max-width: 1180px;
    margin: 0 auto;
    padding: 40px 24px 120px;
    align-items: start;
  }
  @media (max-width: 880px) {
    .manual-root .shell { grid-template-columns: 1fr; gap: 8px; padding: 20px 18px 100px; }
  }

  .manual-root .masthead {
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    padding: 0 0 28px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--line-strong);
    flex-wrap: wrap;
  }
  .manual-root .masthead .brand { display: flex; align-items: baseline; gap: 10px; }
  .manual-root .masthead .brand .mark { font-family: var(--serif); font-weight: 600; font-size: 26px; letter-spacing: 0.2px; }
  .manual-root .masthead .brand .mark .tracer { color: var(--ink); }
  .manual-root .masthead .brand .mark .buddy { color: var(--gold-strong); }
  .manual-root .masthead .kicker { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
  .manual-root .masthead .meta { font-family: var(--mono); font-size: 12px; color: var(--muted); text-align: right; }

  .manual-root nav.toc {
    position: sticky;
    top: 32px;
    align-self: start;
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    padding-right: 4px;
  }
  @media (max-width: 880px) {
    .manual-root nav.toc { position: static; max-height: none; flex-direction: row; flex-wrap: wrap; gap: 6px; margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
  }
  .manual-root nav.toc .toc-title { font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px 12px; }
  @media (max-width: 880px) { .manual-root nav.toc .toc-title { display: none; } }
  .manual-root .navlink { display: flex; align-items: baseline; gap: 10px; text-decoration: none; color: var(--ink-soft); padding: 7px 12px; border-radius: 6px; font-size: 13.5px; transition: background-color 120ms ease, color 120ms ease; }
  .manual-root .navlink .num { font-family: var(--mono); font-size: 11px; color: var(--muted); min-width: 16px; }
  .manual-root .navlink:hover { background: var(--line); color: var(--ink); }
  .manual-root .navlink.active { background: var(--forest); color: #f1ead4; }
  .manual-root .navlink.active .num { color: var(--gold); }
  @media (max-width: 880px) {
    .manual-root .navlink { padding: 5px 10px; border: 1px solid var(--line); font-size: 12.5px; }
    .manual-root .navlink.active { border-color: var(--forest); }
  }

  .manual-root main { min-width: 0; }
  .manual-root section.chapter { scroll-margin-top: 24px; margin-bottom: 56px; }
  .manual-root section.chapter:last-child { margin-bottom: 0; }

  .manual-root .chapter-band { display: flex; align-items: baseline; gap: 14px; background: var(--forest); color: #f1ead4; padding: 16px 22px; border-radius: var(--radius); margin-bottom: 20px; }
  .manual-root .chapter-band .num { font-family: var(--mono); font-size: 13px; color: var(--gold); letter-spacing: 0.04em; }
  .manual-root .chapter-band h2 { margin: 0; font-size: 22px; color: #f8f3e4; }
  .manual-root .chapter-dek { color: var(--muted); font-size: 14.5px; margin: -6px 0 22px; max-width: 62ch; }

  .manual-root h3.feature { font-size: 16.5px; margin: 30px 0 8px; display: flex; align-items: center; gap: 8px; }
  .manual-root h3.feature .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); flex-shrink: 0; }
  .manual-root section.chapter > h3.feature:first-of-type { margin-top: 0; }

  .manual-root p { margin: 0 0 14px; color: var(--ink-soft); max-width: 66ch; }
  .manual-root p:last-child { margin-bottom: 0; }
  .manual-root strong { color: var(--ink); font-weight: 600; }

  .manual-root ul.steps, .manual-root ol.steps { margin: 0 0 14px; padding-left: 0; list-style: none; max-width: 64ch; }
  .manual-root ul.steps li, .manual-root ol.steps li { position: relative; padding: 5px 0 5px 22px; color: var(--ink-soft); }
  .manual-root ul.steps li::before { content: ""; position: absolute; left: 4px; top: 14px; width: 5px; height: 5px; border-radius: 50%; background: var(--line-strong); }
  .manual-root ol.steps { counter-reset: step; }
  .manual-root ol.steps li { counter-increment: step; padding-left: 26px; }
  .manual-root ol.steps li::before { content: counter(step); position: absolute; left: 0; top: 4px; font-family: var(--mono); font-size: 11px; color: var(--gold-strong); width: 18px; }

  .manual-root .card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow); margin: 14px 0; }
  .manual-root .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 16px 0 22px; }
  .manual-root .card-grid .card { margin: 0; }
  .manual-root .card h4 { font-family: var(--sans); font-weight: 650; font-size: 13.5px; margin: 0 0 5px; color: var(--ink); }
  .manual-root .card p { font-size: 13.5px; margin: 0; }

  .manual-root .tip { display: flex; gap: 12px; background: var(--code-bg); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13.5px; }
  .manual-root .tip .label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold-strong); flex-shrink: 0; padding-top: 2px; }
  .manual-root .tip p { margin: 0; color: var(--ink-soft); }

  .manual-root .table-wrap { overflow-x: auto; margin: 16px 0 22px; border: 1px solid var(--line); border-radius: var(--radius); }
  .manual-root table { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 480px; }
  .manual-root thead th { text-align: left; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); background: var(--code-bg); padding: 10px 14px; border-bottom: 1px solid var(--line); }
  .manual-root tbody td { padding: 10px 14px; border-bottom: 1px solid var(--line); color: var(--ink-soft); vertical-align: top; }
  .manual-root tbody tr:last-child td { border-bottom: none; }
  .manual-root tbody td.phrase { font-family: var(--mono); color: var(--ink); white-space: nowrap; }

  .manual-root .badge { display: inline-block; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.04em; padding: 2px 8px; border-radius: 20px; border: 1px solid var(--line-strong); color: var(--muted); }
  .manual-root .badge.pro { color: var(--gold-strong); border-color: var(--gold); }
  .manual-root .badge.new { color: var(--forest-soft); border-color: var(--gold); background: var(--code-bg); }

  .manual-root hr.rule { border: none; border-top: 1px solid var(--line); margin: 26px 0; }

  .manual-root footer.colophon {
    grid-column: 1 / -1;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--muted);
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  @media (prefers-reduced-motion: reduce) {
    .manual-root * { transition: none !important; scroll-behavior: auto !important; }
  }
  .manual-root { scroll-behavior: smooth; }
`

const MANUAL_BODY = `
<div class="shell">

  <div class="masthead">
    <div class="brand">
      <span class="mark"><span class="tracer">Tracer</span><span class="buddy">Buddy</span></span>
      <span class="kicker">User&nbsp;Manual</span>
    </div>
    <div class="meta">iPhone&nbsp;+&nbsp;Apple&nbsp;Watch &middot; v1.8</div>
  </div>

  <nav class="toc" id="toc">
    <div class="toc-title">Contents</div>
    <a class="navlink" href="#start"><span class="num">01</span>Getting Started</a>
    <a class="navlink" href="#round"><span class="num">02</span>Playing a Round</a>
    <a class="navlink" href="#live"><span class="num">03</span>Live Rounds</a>
    <a class="navlink" href="#caddie"><span class="num">04</span>The Caddie</a>
    <a class="navlink" href="#watch"><span class="num">05</span>Apple Watch</a>
    <a class="navlink" href="#stats"><span class="num">06</span>Stats &amp; My Game</a>
    <a class="navlink" href="#practice"><span class="num">07</span>Practice</a>
    <a class="navlink" href="#history"><span class="num">08</span>Rounds &amp; History</a>
    <a class="navlink" href="#community"><span class="num">09</span>Community</a>
    <a class="navlink" href="#siri"><span class="num">10</span>Siri Shortcuts</a>
    <a class="navlink" href="#settings"><span class="num">11</span>Settings &amp; Pro</a>
    <a class="navlink" href="#tips"><span class="num">12</span>Tips &amp; Fixes</a>
  </nav>

  <main>

    <section class="chapter" id="start">
      <div class="chapter-band"><span class="num">01</span><h2>Getting Started</h2></div>
      <p class="chapter-dek">First launch, your profile, and the Home screen &mdash; where every round begins.</p>

      <h3 class="feature"><span class="dot"></span>First launch</h3>
      <p>A short walkthrough introduces GPS shot tracking, the Apple Watch companion, and the AI caddie. On the last screen, enter your <strong>first name</strong> and, if you know it, your current <strong>handicap index</strong> &mdash; both are optional and can be changed later, but they let the caddie personalize advice immediately instead of waiting for your first round.</p>

      <h3 class="feature"><span class="dot"></span>Account</h3>
      <p>Create an account or sign in with email and password. Your account is what lets rounds, stats, and club data sync across your iPhone, Apple Watch, and any other device you sign into.</p>

      <h3 class="feature"><span class="dot"></span>Notifications</h3>
      <p>Allow push notifications when prompted so you can hear about them the moment they happen &mdash; a friend joining your Live Round, or a comment or reaction on one of your Community posts. You can change this later in the Settings app under TracerBuddy.</p>

      <h3 class="feature"><span class="dot"></span>The Home tab</h3>
      <div class="card-grid">
        <div class="card"><h4>Performance rings</h4><p>Your current GIR, fairways, and putting at a glance.</p></div>
        <div class="card"><h4>Quick actions</h4><p>One tap into Practice Mode, PuttBuddy, Swing Tempo, or Round History.</p></div>
        <div class="card"><h4>Handicap goal</h4><p>Set a target index and track progress toward it.</p></div>
        <div class="card"><h4>Recent rounds</h4><p>Your last several rounds, scrollable, tap into any for the full breakdown.</p></div>
      </div>
      <p>The large button at the bottom of Home reads <strong>Start New Round</strong> when nothing's in progress, or <strong>Continue Round</strong> once you've teed off &mdash; it always takes you to wherever you left off.</p>
    </section>

    <section class="chapter" id="round">
      <div class="chapter-band"><span class="num">02</span><h2>Playing a Round</h2></div>
      <p class="chapter-dek">From finding your course to the post-round summary, hole by hole.</p>

      <h3 class="feature"><span class="dot"></span>Find a course</h3>
      <ul class="steps">
        <li>Type a course or city name, or tap <strong>Near Me</strong> for GPS-based search across 42,000+ courses worldwide.</li>
        <li>If you're standing on a course TracerBuddy recognizes, an <strong>&ldquo;Are you playing here?&rdquo;</strong> banner appears automatically &mdash; tap Yes to skip search entirely.</li>
        <li>No signal? Recently played courses stay available offline.</li>
      </ul>

      <h3 class="feature"><span class="dot"></span>Round setup</h3>
      <p>Pick your tees and a format &mdash; <strong>Stroke Play</strong>, <strong>Stableford</strong>, <strong>Match Play</strong>, <strong>Skins</strong>, or <strong>Best Ball</strong> &mdash; and check the live weather for the course before you tee off. Tap <strong>Get Game Plan</strong> for an AI-written hole-by-hole strategy built from the course layout, wind, and your own stats.</p>

      <h3 class="feature"><span class="dot"></span>Scoring</h3>
      <p>The scorecard tracks strokes, putts, penalties, and mulligans per hole with simple +/- taps, plus greens- and fairways-hit toggles. Front/back nine totals and your format-specific score (Stableford points, match status, skins won) update live.</p>

      <h3 class="feature"><span class="dot"></span>Hole map &amp; distances</h3>
      <p>A satellite map shows the tee-to-green line with live <strong>front / center / back</strong> yardages that update as you walk, plus a <strong>plays-like</strong> distance adjusted for elevation once course elevation data is cached. If the pin isn't where the default marker shows, drag it to the real position &mdash; the app remembers it for the rest of your round.</p>

      <h3 class="feature"><span class="dot"></span>Ghost Shot &amp; club selection</h3>
      <p>Pick a club and see a projected landing zone drawn right on the map, with distance remaining to the pin from that spot. The club strip below auto-suggests a club based on your distance and your own tracked averages &mdash; tap any other club to override.</p>

      <h3 class="feature"><span class="dot"></span>On-course tools</h3>
      <div class="card-grid">
        <div class="card"><h4>Green Reading</h4><p>Log break direction, amount, and notes per hole.</p></div>
        <div class="card"><h4>Weather Predictor</h4><p>Type a distance, get it adjusted for temperature and wind.</p></div>
        <div class="card"><h4>Course Conditions</h4><p>Log firmness, green speed, and rough length &mdash; the caddie factors it in.</p></div>
        <div class="card"><h4>Caddie Notes</h4><p>Freeform per-hole notes tied to the course, waiting for you next visit.</p></div>
      </div>

      <h3 class="feature"><span class="dot"></span>Ending the round</h3>
      <p>The Post-Round Summary shows your score against par, GIR / fairways / putts / penalties, your goal result if you set one, an estimated strokes-gained breakdown, and an AI debrief calling out what actually cost you strokes &mdash; with one specific thing to work on before your next round.</p>
    </section>

    <section class="chapter" id="live">
      <div class="chapter-band"><span class="num">03</span><h2>Live Rounds <span class="badge new">NEW</span></h2></div>
      <p class="chapter-dek">Play together, in real time, no matter who's carrying the scorecard.</p>

      <h3 class="feature"><span class="dot"></span>Start or join</h3>
      <p>Start a Live Round from the scorecard and share the six-character invite code with your group &mdash; text it, say it, however's easiest. Anyone with the code taps <strong>Join</strong>, enters their name and handicap, and they're in. Each code is unique to your round while it's active, so there's never a mix-up with someone else's group.</p>

      <h3 class="feature"><span class="dot"></span>Real-time scores</h3>
      <p>Every player's scores sync live as they're entered &mdash; no refreshing, no waiting until the end to compare. There's no cap on how many players can join a single Live Round, so it works just as well for a tournament field as it does for your regular foursome.</p>

      <h3 class="feature"><span class="dot"></span>Join notifications</h3>
      <p>As the host, you get a push notification the instant someone joins your round, so you know your group is set without checking the app.</p>
    </section>

    <section class="chapter" id="caddie">
      <div class="chapter-band"><span class="num">04</span><h2>The Caddie</h2></div>
      <p class="chapter-dek">Ask it anything. It already knows your hole, your distance, the wind, and your score.</p>

      <h3 class="feature"><span class="dot"></span>Chat</h3>
      <p>Open the Caddie from the Home tab or the More menu and just ask &mdash; <em>&ldquo;which club for this wind?&rdquo;</em> or <em>&ldquo;I'm in the trees, what's my out?&rdquo;</em> Your current hole, live GPS distance, wind, and score are already in context, so you never have to explain your situation first.</p>

      <h3 class="feature"><span class="dot"></span>Voice</h3>
      <p>Hold the mic button to ask by voice instead of typing, on either the phone or the Watch &mdash; see <a href="#siri">Siri Shortcuts</a> for hands-free access without opening the app at all.</p>

      <h3 class="feature"><span class="dot"></span>Powered by Claude</h3>
      <p>The Caddie &mdash; and every other AI feature in TracerBuddy, from round debriefs to swing-video feedback to your Year in Review &mdash; runs on <strong>Claude</strong>, Anthropic's AI model. Your data is sent server-side only for the specific request being made (a club recommendation, a debrief, etc.) and isn't used to train anything.</p>

      <div class="tip">
        <span class="label">Why it's specific</span>
        <p>Every recommendation is built from <em>your</em> tracked club distances &mdash; not a generic tour average &mdash; so &ldquo;7-iron&rdquo; means your actual 7-iron.</p>
      </div>
    </section>

    <section class="chapter" id="watch">
      <div class="chapter-band"><span class="num">05</span><h2>Apple Watch</h2></div>
      <p class="chapter-dek">Everything you need mid-swing, without touching your phone.</p>

      <h3 class="feature"><span class="dot"></span>Sync</h3>
      <p>Course data, scores, and settings sync automatically between your phone and Watch while a round is active. If you open the Watch app after it's been idle for a few days, give it a moment near your phone to pull a fresh sync before teeing off.</p>

      <h3 class="feature"><span class="dot"></span>Live yardages</h3>
      <p>Front / center / back distances to the pin update as you walk the course, switching to a <strong>plays-like</strong> number once elevation is factored in.</p>

      <h3 class="feature"><span class="dot"></span>Automatic shot &amp; putt logging</h3>
      <p>Motion sensors detect your swing and log it automatically after each shot &mdash; no button press needed. Run the one-time calibration in Watch settings so the sensitivity matches your swing. Putts on the green are also detected automatically, using their own motion pattern rather than the swing calibration. Each swing's speed, tempo, attack angle, and club path is captured too &mdash; see <a href="#practice">Swing Replay</a> to watch it back.</p>

      <h3 class="feature"><span class="dot"></span>Auto-advance</h3>
      <p>Walk within range of the green and hold there for about 30 seconds after finishing the hole, and the Watch advances to the next tee and switches your recommended club to Putter automatically &mdash; nothing to tap.</p>

      <h3 class="feature"><span class="dot"></span>Health &amp; complications</h3>
      <p>Heart rate, steps, calories, and heart-rate recovery after reaching the green are all tracked, and your round is logged to Apple Health as an outdoor walking workout. Add the distance-to-pin complication to any watch face for a glance without opening the app.</p>
    </section>

    <section class="chapter" id="stats">
      <div class="chapter-band"><span class="num">06</span><h2>Stats &amp; My Game</h2></div>
      <p class="chapter-dek">Everything the Stats tab tracks about your game over time.</p>

      <div class="card-grid">
        <div class="card"><h4>Performance</h4><p>Handicap index, scoring average over your last 5/10/20 rounds, hot streaks, best round.</p></div>
        <div class="card"><h4>Course Handicap</h4><p>Enter slope, rating, and par for wherever you're playing to get your course handicap on the spot.</p></div>
        <div class="card"><h4>Last Round Breakdown</h4><p>Your score against your own average, your best ever, and your best at that specific course.</p></div>
        <div class="card"><h4>Handicap Trend</h4><p>A chart of your index over your recent rounds.</p></div>
        <div class="card"><h4>Distance vs Handicap</h4><p>Your average per club against typical distances for your handicap bracket.</p></div>
        <div class="card"><h4>Wedge Gapping</h4><p>Flags wedges within 8 yards of each other and gaps over 20 yards between adjacent wedges.</p></div>
        <div class="card"><h4>My Bag</h4><p>Every club with your real average, min/max, dispersion, and shot-shape tendency.</p></div>
        <div class="card"><h4>Club Confidence</h4><p>Which clubs you can trust under pressure, and which need more reps.</p></div>
        <div class="card"><h4>Fitting Report</h4><p>AI-written notes to bring to an actual club fitting.</p></div>
        <div class="card"><h4>Strokes Gained</h4><p>Off-the-tee, approach, short game, and putting &mdash; broken down per round.</p></div>
        <div class="card"><h4>Year in Review</h4><p>Rounds played, best score, and average for the current year, with an AI-written recap.</p></div>
      </div>
    </section>

    <section class="chapter" id="practice">
      <div class="chapter-band"><span class="num">07</span><h2>Practice</h2></div>
      <p class="chapter-dek">Off the course, still building the numbers the caddie relies on.</p>

      <h3 class="feature"><span class="dot"></span>Practice Mode</h3>
      <p>Log range sessions by club, putting reps by distance, and short-game shots by proximity to the hole &mdash; every logged shot feeds back into your club averages used everywhere else in the app, and syncs to your dashboard at <span class="mono">tracerbuddy.app/dashboard/practice</span>.</p>

      <h3 class="feature"><span class="dot"></span>PuttBuddy</h3>
      <p>After a round, see putts per hole, what's causing your 3-putts, make percentage by distance band, and a specific drill recommendation targeted at your weakest range.</p>

      <h3 class="feature"><span class="dot"></span>Swing Analysis &amp; Tempo</h3>
      <p>Pairs Watch-measured swing speed, tempo, and plane with an optional video upload for AI feedback. Swing Tempo isolates your backswing-to-downswing ratio &mdash; tour average sits close to <strong class="mono">3:1</strong>.</p>

      <h3 class="feature"><span class="dot"></span>Swing Replay</h3>
      <p>On your dashboard, replay your most recent Watch-captured swing as an animated sequence alongside your real club speed, attack angle, tempo ratio, and club path &mdash; not a demo, the actual numbers from that swing.</p>
    </section>

    <section class="chapter" id="history">
      <div class="chapter-band"><span class="num">08</span><h2>Rounds &amp; History</h2></div>
      <p class="chapter-dek">Nothing you play is thrown away.</p>
      <p>Every completed round is saved, and milestones unlock as you go &mdash; first round, 10 / 25 / 50 rounds played, sub-90, sub-80, a birdie round, hot streaks. Tap into any past round for its full breakdown and an AI-written <strong>Round Story</strong> you can copy or share. <strong>Round Replay</strong> plays back any round with GPS-tracked shots as an animated shot-by-shot map. Your complete history can be exported as a CSV at any time.</p>
    </section>

    <section class="chapter" id="community">
      <div class="chapter-band"><span class="num">09</span><h2>Community</h2></div>
      <p class="chapter-dek">Round recaps, tips, and course talk with other golfers.</p>
      <p>Post a round recap, a tip, a question, or a course review. React to posts with &#128293;, &#128077;, or &#127939;, comment, and filter the feed by post type to find what you're after. You'll get a push notification when someone comments on or reacts to one of your own posts &mdash; not for every post in the feed, just yours.</p>
    </section>

    <section class="chapter" id="siri">
      <div class="chapter-band"><span class="num">10</span><h2>Siri Shortcuts</h2></div>
      <p class="chapter-dek">Hands stay on the club. Say the phrase, get the answer spoken back &mdash; no tap, no unlock, no opening the app.</p>

      <h3 class="feature"><span class="dot"></span>Voice phrases</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Say</th><th>What happens</th></tr></thead>
          <tbody>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, start my round&rdquo;</td><td>Detects the course you're standing on by GPS and tees off &mdash; no app, no search.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, ask my caddie&rdquo;</td><td>Ask any golf question, get a spoken answer using your live round context.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, what club should I hit&rdquo;</td><td>Club recommendation with the wind-adjusted yardage.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, what are the yardages&rdquo;</td><td>Front, center, and back distances, plus current wind.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, I made a birdie&rdquo;<br><span style="color:var(--muted); font-family:var(--sans); font-size:12px;">(or eagle, par, bogey, etc.)</span></td><td>Logs the result for the hole and moves you to the next.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, add a stroke&rdquo;<br>&ldquo;Hey Siri, TracerBuddy, remove a stroke&rdquo;</td><td>Nudges the current hole's score by one.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, next hole&rdquo;</td><td>Advances to the next hole and reads back its par and yardage.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, what's my score&rdquo;</td><td>Your total, spoken back to you.</td></tr>
            <tr><td class="phrase">&ldquo;Hey Siri, TracerBuddy, what's my handicap&rdquo;</td><td>Your current index, spoken back to you.</td></tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:13.5px; color:var(--muted);">Say the whole thing as one sentence &mdash; wake word, app name, then the command. &ldquo;TracerBuddy&rdquo; is what tells Siri which app to route to, so it can't be dropped.</p>

      <h3 class="feature"><span class="dot"></span>Ask my caddie &mdash; the on-screen card</h3>
      <p>&ldquo;Ask my caddie&rdquo; is the one phrase that also shows something, not just speaks it. Alongside the spoken answer, a card appears on screen (in the Shortcuts app response, Lock Screen, or Dynamic Island, depending on the device) showing your current hole and par, the full advice text, and a &ldquo;TracerBuddy Caddie&rdquo; footer &mdash; a quick way to glance back at the exact wording Siri just read.</p>

      <div class="tip">
        <span class="label">Why only nine rows</span>
        <p>Apple caps every app at 10 App Shortcuts total. This table's nine rows cover all 10 &mdash; &ldquo;Add a stroke&rdquo; and &ldquo;Remove a stroke&rdquo; share a row. <strong>Log Strokes</strong>, <strong>Should I Go For It</strong>, <strong>What's My Layup</strong>, <strong>Round Stats</strong>, and <strong>Get Hole Info</strong> are still fully working App Intents &mdash; build a Shortcut for any of them manually in the Shortcuts app &mdash; they just don't have a natural &ldquo;Hey Siri&rdquo; phrase of their own, since only 10 phrases fit under Apple's limit.</p>
      </div>

      <div class="tip">
        <span class="label">How hands-free, really</span>
        <p><strong>Genuinely hands-free:</strong> every phrase above &mdash; including starting the round itself now &mdash; plus the Watch's automatic swing/putt detection and hole auto-advance. None of it touches the screen. <strong>Needs a touch first:</strong> picking a course by name instead of GPS, and the in-app &ldquo;hold to talk&rdquo; Caddie voice button, which needs an initial tap before voice takes over.</p>
      </div>
    </section>

    <section class="chapter" id="settings">
      <div class="chapter-band"><span class="num">11</span><h2>Settings &amp; Pro</h2></div>
      <p class="chapter-dek">Your profile, your subscription, and where the two meet.</p>
      <p>Settings holds your name, handicap, a link to your full stats dashboard at <span class="mono">tracerbuddy.app/dashboard</span>, subscription management, and sign out.</p>
      <div class="tip">
        <span class="label"><span class="badge pro">PRO</span></span>
        <p>Your first round is free. Beyond that, TracerBuddy Pro unlocks unlimited rounds plus every tool, stat, and the Community feed. Already subscribed on another device? <strong>Restore Purchases</strong> in Settings picks it back up.</p>
      </div>
    </section>

    <section class="chapter" id="tips">
      <div class="chapter-band"><span class="num">12</span><h2>Tips &amp; Fixes</h2></div>
      <p class="chapter-dek">The handful of things worth knowing before you're standing on the first tee wondering why.</p>

      <ul class="steps">
        <li><strong>GPS distances need open sky.</strong> Heavy tree cover or being indoors will show stale or unavailable distances until you're back under open sky.</li>
        <li><strong>Watch not showing course data after a few idle days?</strong> Open the phone app first and let it sync &mdash; the Watch pulls fresh course data from your phone.</li>
        <li><strong>Club distances look off for a club you rarely use?</strong> Until you've logged a few real shots with it, TracerBuddy shows a general average for your handicap bracket rather than a personal one &mdash; it personalizes automatically once you've logged shots.</li>
        <li><strong>Plays-like distance seems unavailable on a new course?</strong> Elevation data is fetched and cached the first time you load a course's hole map &mdash; give it a moment on your first visit.</li>
        <li><strong>Auto swing detection missing shots or triggering on waggles?</strong> Re-run calibration in Watch settings &mdash; it's a quick three-swing process that resets the sensitivity threshold to your swing.</li>
        <li><strong>Not getting Live Round or Community notifications?</strong> Check Settings app &rarr; TracerBuddy &rarr; Notifications is turned on for your device.</li>
      </ul>
    </section>

  </main>

  <footer class="colophon">
    <span>TracerBuddy for iPhone &amp; Apple Watch</span>
    <span>tracerbuddy.app</span>
  </footer>

</div>
`

export default function ManualPage() {
  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.navlink'))
    const sections = links.map(l => document.getElementById(l.getAttribute('href')!.slice(1)))

    function setActive() {
      const pos = window.scrollY + 120
      let current = sections[0]
      for (const s of sections) {
        if (s && s.offsetTop <= pos) current = s
      }
      links.forEach(l => {
        l.classList.toggle('active', !!current && l.getAttribute('href') === '#' + current.id)
      })
    }

    window.addEventListener('scroll', setActive, { passive: true })
    setActive()
    return () => window.removeEventListener('scroll', setActive)
  }, [])

  return (
    <div className="manual-root">
      <style dangerouslySetInnerHTML={{ __html: MANUAL_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: MANUAL_BODY }} />
    </div>
  )
}
