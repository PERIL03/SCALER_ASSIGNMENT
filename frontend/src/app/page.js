import Link from "next/link";
import GoogleAuthControls from "@/components/GoogleAuthControls";
import HeroMeetingPreview from "@/components/HeroMeetingPreview";

const NAV_LINKS = [
  { label: "Event Types", href: "/dashboard" },
  { label: "Availability", href: "/availability" },
  { label: "Bookings", href: "/bookings" },
  { label: "User Booking Page", href: "/book/intro-call" },
];
const PARTNERS = ["vercel", "supabase", "udemy", "rho", "deel", "framer", "ramp"];
const PARTNER_TICKER = [...PARTNERS, ...PARTNERS];
const HERO_ACTIONS = [
  { label: "Create account", type: "dark", href: "/signup" },
  { label: "Explore dashboard", type: "light", href: "/dashboard" },
];
const APPS = [
  { key: "meet", name: "Google Meet", initials: "M", color: "meet" },
  { key: "calendar", name: "Google Calendar", initials: "31", color: "calendar" },
  { key: "teams", name: "Microsoft Teams", initials: "T", color: "teams" },
  { key: "zoom", name: "Zoom", initials: "Z", color: "zoom" },
  { key: "analytics", name: "Google Analytics", initials: "GA", color: "analytics" },
  { key: "zapier", name: "Zapier", initials: "Z", color: "zapier" },
];
const STEPS = [
  {
    id: "01",
    title: "Connect your calendar",
    description:
      "We'll handle all the cross-referencing, so you don't have to worry about double bookings.",
    preview: ["Google", "Outlook", "iCloud"],
  },
  {
    id: "02",
    title: "Set your availability",
    description:
      "Want to block off weekends? Set up daily buffers and meeting limits in a few clicks.",
    preview: ["Mon 8:30 - 5:00", "Tue 9:00 - 6:30", "Wed 10:00 - 7:00"],
  },
  {
    id: "03",
    title: "Choose how to meet",
    description: "It could be video chat, phone call, or even an in-person meet up.",
    preview: ["Google Meet", "Phone", "In person"],
  },
];

export default function LandingPage() {
  return (
    <div className="calx-shell">
      <div className="calx-grid" aria-hidden="true" />

      <div className="calx-container">
        <header className="calx-nav-wrap">
          <div className="calx-brand">Cal.com</div>
          <nav className="calx-nav" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="calx-nav-actions">
            <GoogleAuthControls compact />
          </div>
        </header>

        <main className="calx-main">
          <section className="calx-hero card">
            <div className="calx-banner">
              <span>Moving from Clockwise? Set a priority call with our team today.</span>
              <button type="button">Book a demo</button>
            </div>

            <div className="calx-hero-inner">
              <div className="calx-copy">
                <p className="calx-pill">Cal.com launches v6.3</p>
                <h1>The better way to schedule your meetings</h1>
                <p>
                  A fully customizable scheduling software for individuals, businesses,
                  and developers building scheduling where users meet users.
                </p>
                <div className="calx-cta-row">
                  {HERO_ACTIONS.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className={`calx-btn calx-btn-${action.type} calx-btn-wide`}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
                <small>No credit card required</small>
              </div>

              <HeroMeetingPreview />
            </div>
          </section>

          <section className="calx-trust">
            <p>Trusted by fast-growing companies around the world</p>
            <div className="calx-logo-marquee" aria-label="Partner logos">
              <div className="calx-logo-track">
                {PARTNER_TICKER.map((partner, index) => (
                  <span key={`${partner}-${index}`}>{partner}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="calx-section-head">
            <p className="calx-pill">How it works</p>
            <h2>With us, appointment scheduling is easy</h2>
            <p>
              Effortless scheduling for businesses and individuals, powerful solutions
              for fast-growing modern companies.
            </p>
          </section>

          <section className="calx-steps">
            {STEPS.map((step) => (
              <article key={step.id} className="card calx-step-card">
                <span className="calx-chip">{step.id}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <div className="calx-mini-preview" aria-hidden="true">
                  {step.preview.map((row) => (
                    <span key={row}>{row}</span>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="card calx-apps">
            <div>
              <p className="calx-pill">App store</p>
              <h2>All your key tools in-sync with your meetings</h2>
              <p>
                Works with the apps already in your flow, ensuring every booking fits
                into your team&apos;s real workflow.
              </p>
              <div className="calx-dual-cta">
                <button type="button" className="calx-btn calx-btn-dark">
                  Get started
                </button>
                <button type="button" className="calx-btn calx-btn-light">
                  Explore apps
                </button>
              </div>
            </div>

            <div className="calx-icon-grid calx-icon-grid-live" aria-label="Integrations">
              {APPS.map((app, index) => (
                <article
                  key={app.key}
                  className={`calx-app-tile calx-app-tile-${index + 1}`}
                  aria-label={app.name}
                >
                  <span className={`calx-app-mark calx-app-mark-${app.color}`}>{app.initials}</span>
                  <strong>{app.name}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="card calx-final-cta">
            <p className="calx-pill">Start now</p>
            <h2>Book more meetings with less back and forth</h2>
            <p>Set up your scheduling workflow in minutes and share your booking link instantly.</p>
            <div className="calx-dual-cta">
              <Link href="/signup" className="calx-btn calx-btn-dark">
                Create account
              </Link>
              <Link href="/book/intro-call" className="calx-btn calx-btn-light">
                View booking page
              </Link>
            </div>
          </section>
        </main>

        <footer className="calx-footer">
          <p>Built for modern scheduling teams and solo creators.</p>
          <Link href="/dashboard">Open dashboard</Link>
        </footer>
      </div>
    </div>
  );
}
