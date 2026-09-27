import { useState, type FormEvent } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, Compass, Heart, MapPin, Menu, Plus, Search, Sparkles, TicketCheck, X } from "lucide-react";
import { eventCategorySchema, type CreateEventInput, type EventDto } from "@events/api-contracts";
import { useAuth } from "./shared/auth-context.js";
import { eventsApi } from "./shared/events-api.js";

const categories = ["All", ...eventCategorySchema.options];
const coverFallback = "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1400&q=85";

function formatDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "Asia/Kolkata" }).format(new Date(date));
}
function formatTime(date: string) { return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(date)); }
function initials(name: string) { return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(); }
function toLocalInputValue(date: string) { const value = new Date(date); return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }

export function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const { user, ready, signOut } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="app-loading"><span className="brand-mark">g</span><span>Setting a place for you…</span></div>;

  return <>
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" to="/"><span className="brand-mark">g</span><span>gather<span className="wordmark-dot">.</span></span></Link>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={location.pathname === "/" ? "active" : ""} to="/"><Compass size={16} /> Discover</Link>
          <Link className={location.pathname === "/my-events" ? "active" : ""} to="/my-events"><TicketCheck size={16} /> My plans</Link>
        </nav>
        <div className="header-actions">
          <Link className="create-link" to="/events/new"><Plus size={16} aria-hidden="true" /> Host an event</Link>
          {user ? <div className="user-menu"><span className="avatar avatar-user">{initials(user.name)}</span><button className="user-name" onClick={() => void signOut()} title="Sign out">{user.name.split(" ")[0]} <ChevronDown size={14} /></button></div> : <button className="sign-in-button" onClick={() => setAuthOpen(true)}>Sign in <ArrowUpRight size={15} /></button>}
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setAuthOpen(true)}><Menu /></button>
        </div>
      </div>
    </header>
    <main>
      <Routes>
        <Route path="/" element={<DiscoverPage onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/events/:eventId" element={<EventDetailPage onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/events/new" element={<EventFormPage mode="create" onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/events/:eventId/edit" element={<EventFormPage mode="edit" onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/my-events" element={<MyPlansPage onSignIn={() => setAuthOpen(true)} />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    <footer className="site-footer"><div><Link className="wordmark footer-wordmark" to="/"><span className="brand-mark">g</span><span>gather<span className="wordmark-dot">.</span></span></Link><span>Good things happen when we show up.</span></div><span>Made for your next good story <Heart size={13} fill="currentColor" /></span></footer>
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
  </>;
}

function DiscoverPage({ onSignIn }: { onSignIn: () => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["events", search, category, user?.accessToken], queryFn: () => eventsApi.list(user?.accessToken ?? null, search, category) });
  const events = query.data ?? [];
  const featured = events[0];

  return <>
    <section className="hero-wrap">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> YOUR CITY, A LITTLE CLOSER</div>
        <h1>Find your <em>people.</em></h1>
        <p>Good things happen when we show up. Find the little gatherings and big nights that make a city feel like yours.</p>
        <div className="hero-note"><span className="note-icon"><Sparkles size={16} /></span><span>Curated moments, made for being together.</span></div>
      </div>
      <div className="hero-art">
        <div className="hero-photo" style={{ backgroundImage: `url(${featured?.imageUrl ?? coverFallback})` }} />
        <div className="hero-photo-wash" />
        <div className="photo-label"><span className="live-dot" /> WHAT'S HAPPENING</div>
        <div className="hero-event-card">
          <div className="hero-card-top"><span className="category-pill">{featured?.category ?? "Around town"}</span><span className="hero-card-date">{featured ? formatDate(featured.startsAt) : "This week"}</span></div>
          <h2>{featured?.title ?? "A good time is closer than you think."}</h2>
          <div className="hero-card-meta"><MapPin size={14} /> {featured?.location ?? "Your neighborhood"}</div>
          {featured && <Link to={`/events/${featured.id}`} className="circle-arrow" aria-label="Explore featured event"><ArrowUpRight size={20} /></Link>}
        </div>
        <span className="hero-sticker"><span>✳</span><small>MAKE<br />A PLAN</small></span>
      </div>
    </section>

    <section className="discover-section" id="events">
      <div className="section-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> THE GOOD STUFF</div><h2>Find your kind <em>of fun.</em></h2></div>
        <p>A few lovely ways to spend your time.<br />Pick one and make it yours.</p>
      </div>
      <div className="browse-tools">
        <div className="search-field"><Search size={18} /><input aria-label="Search events" placeholder="Try jazz, chai, or a place…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></div>
        <div className="category-tabs" role="group" aria-label="Filter events by category">
          {categories.map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </div>
      {query.isLoading ? <div className="state-message"><span className="brand-mark">g</span> Finding good things…</div> : query.isError ? <div className="state-message error-state">We couldn’t load events. Check that the API is running, then try again.</div> : events.length === 0 ? <div className="empty-state"><span>✳</span><h3>No plans found just yet.</h3><p>Try another search or choose a different category.</p></div> : <div className="event-grid">{events.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div>}
      <div className="hosting-banner"><div className="banner-star">✳</div><div><span className="eyebrow">GOOD THINGS START WITH YOU</span><h3>Have a little something in mind?</h3><p>Bring your people together. The best plans are the ones we make.</p></div><Link className="button button-dark" to="/events/new" onClick={(event) => { if (!user) { event.preventDefault(); onSignIn(); } }}>Host an event <ArrowRight size={16} /></Link></div>
    </section>
  </>;
}

function EventCard({ event, index }: { event: EventDto; index: number }) {
  return <article className={`event-card event-card-${index % 3}`}>
    <Link className="card-image-link" to={`/events/${event.id}`} aria-label={`View ${event.title}`}>
      <img className="event-image" src={event.imageUrl} alt="" loading="lazy" onError={(image) => { image.currentTarget.src = coverFallback; }} />
      <span className="image-category">{event.category}</span><span className="image-arrow"><ArrowUpRight size={18} /></span>
    </Link>
    <div className="card-content">
      <div className="card-date">{formatDate(event.startsAt)} <span>·</span> {formatTime(event.startsAt)}</div>
      <Link to={`/events/${event.id}`} className="card-title">{event.title}</Link>
      <div className="card-location"><MapPin size={14} /> {event.location}</div>
      <div className="card-bottom"><div className="avatar-stack">{event.attendeeAvatars.slice(0, 3).map((avatar, i) => <img key={avatar + i} src={avatar} alt="" />)}<span className="attendee-count">+{event.attendeeCount}</span></div><span className="going-label">going</span><span className="card-save"><Heart size={16} /></span></div>
    </div>
  </article>;
}

function EventDetailPage({ onSignIn }: { onSignIn: () => void }) {
  const { eventId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const eventQuery = useQuery({ queryKey: ["event", eventId, user?.accessToken], queryFn: () => eventsApi.get(eventId, user?.accessToken ?? null) });
  const mutation = useMutation({ mutationFn: (attending: boolean) => eventsApi.rsvp(eventId, user!.accessToken, attending), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["event", eventId] }); await queryClient.invalidateQueries({ queryKey: ["events"] }); await queryClient.invalidateQueries({ queryKey: ["my-rsvps"] }); } });
  const event = eventQuery.data;
  if (eventQuery.isLoading) return <div className="state-message detail-loading">Loading your next plan…</div>;
  if (!event) return <div className="state-message error-state">We couldn’t find this event. <Link to="/">Back to all events</Link></div>;
  const isHost = user?.id === event.hostId;

  return <section className="detail-page">
    <Link className="back-link" to="/"><ArrowLeft size={16} /> All events</Link>
    <div className="detail-layout">
      <div className="detail-main">
        <div className="detail-cover"><img src={event.imageUrl} alt="" onError={(image) => { image.currentTarget.src = coverFallback; }} /><span className="image-category">{event.category}</span></div>
        <div className="detail-heading"><div><div className="eyebrow">A GATHERING BY {event.hostName.toUpperCase()}</div><h1>{event.title}</h1></div>{isHost && <Link to={`/events/${event.id}/edit`} className="button button-outline">Edit event</Link>}</div>
        <div className="detail-description"><h2>A little about it</h2><p>{event.description}</p></div>
        <div className="host-note"><div className="host-avatar">{initials(event.hostName)}</div><div><small>HOSTED BY</small><strong>{event.hostName}</strong><span>Bringing good people together.</span></div><Sparkles size={18} /></div>
      </div>
      <aside className="event-facts">
        <span className="eyebrow">SAVE YOUR SPOT</span>
        <div className="fact-row"><span className="fact-icon"><CalendarDays size={18} /></span><div><small>DATE</small><strong>{formatDate(event.startsAt, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong></div></div>
        <div className="fact-row"><span className="fact-icon"><Clock3 size={18} /></span><div><small>TIME</small><strong>{formatTime(event.startsAt)}{event.endsAt ? ` – ${formatTime(event.endsAt)}` : " onwards"}</strong></div></div>
        <div className="fact-row"><span className="fact-icon"><MapPin size={18} /></span><div><small>WHERE</small><strong>{event.location}</strong></div></div>
        <div className="attending-box"><div className="avatar-stack">{event.attendeeAvatars.slice(0, 3).map((avatar, i) => <img key={avatar + i} src={avatar} alt="" />)}</div><p><strong>{event.attendeeCount} people</strong><br />are making a plan</p></div>
        <button className={`button rsvp-button ${event.isAttending ? "button-confirmed" : "button-terracotta"}`} disabled={mutation.isPending} onClick={() => user ? mutation.mutate(!event.isAttending) : onSignIn()}>{event.isAttending ? <><Check size={17} /> You’re going</> : <>Count me in <ArrowRight size={16} /></>}</button>
        {event.isAttending && <button className="cancel-rsvp" onClick={() => mutation.mutate(false)}>Can’t make it anymore?</button>}
        {mutation.isError && <p className="form-error">{mutation.error.message}</p>}
        <p className="rsvp-footnote">Free to join · Good vibes included</p>
      </aside>
    </div>
  </section>;
}

function EventFormPage({ mode, onSignIn }: { mode: "create" | "edit"; onSignIn: () => void }) {
  const { eventId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const eventQuery = useQuery({ queryKey: ["event", eventId, user?.accessToken], queryFn: () => eventsApi.get(eventId, user?.accessToken ?? null), enabled: mode === "edit" && Boolean(eventId) });
  const event = eventQuery.data;
  const mutation = useMutation({
    mutationFn: (input: CreateEventInput) => mode === "edit" ? eventsApi.update(eventId, input, user!.accessToken) : eventsApi.create(input, user!.accessToken),
    onSuccess: async (created) => { await queryClient.invalidateQueries({ queryKey: ["events"] }); await queryClient.invalidateQueries({ queryKey: ["event", eventId] }); navigate(`/events/${created.id}`); },
  });
  if (!user) return <section className="form-page"><Link to="/" className="back-link"><ArrowLeft size={16} /> Back to discover</Link><div className="form-intro"><div className="eyebrow">MAKE A LITTLE MAGIC</div><h1>Bring people <em>together.</em></h1><p>Sign in to share a gathering with your city.</p><button className="button button-terracotta" onClick={onSignIn}>Sign in to continue <ArrowRight size={16} /></button></div></section>;
  if (mode === "edit" && !event && eventQuery.isLoading) return <div className="state-message">Loading event…</div>;
  if (mode === "edit" && event && event.hostId !== user.id) return <div className="state-message error-state">Only the host can edit this event. <Link to={`/events/${event.id}`}>Return to event</Link></div>;
  return <section className="form-page">
    <Link to={mode === "edit" ? `/events/${eventId}` : "/"} className="back-link"><ArrowLeft size={16} /> {mode === "edit" ? "Back to event" : "Back to discover"}</Link>
    <div className="form-layout"><div className="form-intro"><div className="eyebrow">MAKE A LITTLE MAGIC</div><h1>{mode === "edit" ? <>Make it <em>yours.</em></> : <>Bring people <em>together.</em></>}</h1><p>Great plans start with a small invitation. Tell us what you have in mind.</p><div className="form-side-note"><Sparkles size={17} /><span>It doesn't need to be big to mean something.</span></div></div>
      <EventEditor key={event?.id ?? "new"} event={event} pending={mutation.isPending} error={mutation.error?.message} onSubmit={(input) => mutation.mutate(input)} />
    </div>
  </section>;
}

function EventEditor({ event, pending, error, onSubmit }: { event?: EventDto; pending: boolean; error?: string; onSubmit: (input: CreateEventInput) => void }) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [date, setDate] = useState(event ? toLocalInputValue(event.startsAt) : "");
  const [endDate, setEndDate] = useState(event?.endsAt ? toLocalInputValue(event.endsAt) : "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [category, setCategory] = useState<CreateEventInput["category"]>(event?.category ?? "Community");
  const [imageUrl, setImageUrl] = useState(event?.imageUrl ?? "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85");
  const [localError, setLocalError] = useState("");

  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault(); setLocalError("");
    const startsAt = new Date(date).toISOString();
    const endsAt = endDate ? new Date(endDate).toISOString() : null;
    try { onSubmit({ title, description, startsAt, endsAt, location, category: category as CreateEventInput["category"], imageUrl }); }
    catch (cause) { setLocalError(cause instanceof Error ? cause.message : "Please review the event details."); }
  }

  return <form className="event-form" onSubmit={submit}>
    <div className="form-title-row"><div><span className="step-number">01</span><h2>The details</h2></div><span>All fields marked <b>*</b> are required</span></div>
    <label><span className="field-label">Event name <b>*</b></span><input required minLength={4} maxLength={90} placeholder="Give your gathering a name" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label><span className="field-label">What’s it about? <b>*</b></span><textarea required minLength={20} maxLength={2000} rows={4} placeholder="Tell people what makes this one special…" value={description} onChange={(event) => setDescription(event.target.value)} /><span className="field-hint">A few details help people picture themselves there.</span></label>
    <div className="form-two-col"><label><span className="field-label">Date & time <b>*</b></span><input type="datetime-local" required value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span className="field-label">Ends at <span className="optional">OPTIONAL</span></span><input type="datetime-local" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
    <label><span className="field-label">Location <b>*</b></span><input required minLength={3} maxLength={160} placeholder="Venue name or neighborhood" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
    <div className="form-two-col"><label><span className="field-label">Kind of gathering <b>*</b></span><select value={category} onChange={(event) => setCategory(eventCategorySchema.parse(event.target.value))}>{eventCategorySchema.options.map((option) => <option key={option}>{option}</option>)}</select></label><label><span className="field-label">Cover image URL</span><input type="url" required value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label></div>
    {(localError || error) && <p className="form-error">{localError || error}</p>}
    <div className="form-submit-row"><span>Be kind, be curious, and have a lovely time.</span><button className="button button-terracotta" type="submit" disabled={pending}>{pending ? "Saving…" : event ? "Save changes" : "Create event"} <ArrowRight size={16} /></button></div>
  </form>;
}

function MyPlansPage({ onSignIn }: { onSignIn: () => void }) {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["my-rsvps", user?.accessToken], queryFn: () => eventsApi.myRsvps(user!.accessToken), enabled: Boolean(user) });
  if (!user) return <section className="my-plans-empty"><span className="large-icon"><TicketCheck size={28} /></span><div className="eyebrow">YOUR PLANS, ALL IN ONE PLACE</div><h1>Good things are <em>ahead.</em></h1><p>Sign in to see the events you’re going to.</p><button className="button button-terracotta" onClick={onSignIn}>Sign in to see plans <ArrowRight size={16} /></button></section>;
  return <section className="my-plans-page"><div className="eyebrow">YOUR PLANS, ALL IN ONE PLACE</div><h1>Good things are <em>ahead.</em></h1><p>Everything you’re looking forward to.</p>{query.isLoading ? <div className="state-message">Gathering your plans…</div> : query.data?.length ? <div className="event-grid">{query.data.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div> : <div className="empty-state"><span>✳</span><h3>Your calendar is waiting.</h3><p>Find a gathering that feels like you and save your spot.</p><Link to="/" className="button button-dark">Discover events <ArrowRight size={16} /></Link></div>}</section>;
}

function AuthCallbackPage() {
  const { ready, user } = useAuth();
  const navigate = useNavigate();
  if (ready) {
    if (user) { window.setTimeout(() => navigate("/", { replace: true }), 900); return <div className="callback-page"><span className="brand-mark">g</span><h1>You’re in.</h1><p>Taking you back to the good stuff…</p></div>; }
    return <div className="callback-page"><span className="brand-mark">g</span><h1>Almost there.</h1><p>That sign-in link may have expired. Request a fresh one and try again.</p><Link to="/">Back to Gather <ArrowRight size={16} /></Link></div>;
  }
  return <div className="callback-page"><span className="brand-mark">g</span><h1>Checking your link…</h1><p>One little moment.</p></div>;
}

function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithMagicLink, continueAsDemo, demoMode } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try { await signInWithMagicLink(email); setSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send the sign-in link."); }
    finally { setLoading(false); }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" aria-label="Close dialog" onClick={onClose}><X size={19} /></button><span className="brand-mark modal-mark">g</span>
      {sent ? <><div className="eyebrow">CHECK YOUR INBOX</div><h2 id="auth-title">A little link is on its way.</h2><p>We sent a sign-in link to <strong>{email}</strong>. Come back here after you tap it.</p><button className="button button-dark modal-action" onClick={onClose}>Lovely, thanks</button></> : <><div className="eyebrow">COME ON IN</div><h2 id="auth-title">Make yourself <em>at home.</em></h2><p>Sign in to save your spot or bring your own people together.</p><form onSubmit={submit}><label className="modal-label">Email address<input type="email" required autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>{error && <p className="form-error">{error}</p>}<button className="button button-terracotta modal-action" disabled={loading}>{loading ? "Sending your link…" : "Email me a sign-in link"} <ArrowRight size={16} /></button></form>{demoMode && <><div className="modal-divider"><span /> OR <span /></div><button className="demo-button" onClick={() => { continueAsDemo(); onClose(); }}>Continue in demo mode <ArrowUpRight size={14} /></button><small className="demo-caption">No account needed · Demo changes live in this session</small></>}{!demoMode && <small className="demo-caption">One tap and you’re in. No password to remember.</small>}</>}
    </section>
  </div>;
}
