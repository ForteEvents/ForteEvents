import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')

  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('dashboard')

  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [venue, setVenue] = useState('')

  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventMessage, setEventMessage] = useState('')

  // =========================
  // AUTH
  // =========================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession)
        }
      )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // =========================
  // LOGIN / CREATE ACCOUNT
  // =========================
  const submit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (mode === 'login') {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password
        })

      if (error) {
        setMessage(error.message)
        return
      }

      setSession(data.session)
      return
    }

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone: phone
          }
        }
      })

    if (error) {
      setMessage(error.message)
      return
    }

    if (data.user) {
      const { error: profileError } =
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            full_name: name,
            phone: phone,
            email: email,
            sms_balance: 0
          })

      if (profileError) {
        console.log(
          'Profile error:',
          profileError.message
        )
      }
    }

    if (data.session) {
      setSession(data.session)
    } else {
      setMessage(
        'Account imeundwa. Angalia email yako kuthibitisha.'
      )
    }
  }

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null)
      return
    }

    const loadProfile = async () => {
      const { data, error } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

      if (error) {
        console.log(
          'Profile error:',
          error.message
        )
      } else {
        setProfile(data)
      }
    }

    loadProfile()
  }, [session])

  // =========================
  // LOAD EVENTS
  // =========================
  const loadEvents = async () => {
    if (!session?.user?.id) return

    setEventsLoading(true)

    const { data, error } =
      await supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', {
          ascending: false
        })

    if (error) {
      console.log(
        'Events error:',
        error.message
      )

      setEventMessage(error.message)
      setEvents([])
    } else {
      setEvents(data || [])
      setEventMessage('')
    }

    setEventsLoading(false)
  }

  useEffect(() => {
    if (session?.user?.id) {
      loadEvents()
    }
  }, [session])

  // =========================
  // CREATE EVENT
  // =========================
  const createEvent = async (e) => {
    e.preventDefault()
    setEventMessage('')

    if (!eventName || !eventDate) {
      setEventMessage(
        'Tafadhali jaza jina la event na tarehe.'
      )
      return
    }

    const { error } =
      await supabase
        .from('events')
        .insert({
          user_id: session.user.id,
          event_name: eventName,
          event_type: eventType,
          description: eventDescription,
          event_date: eventDate,
          event_time: eventTime || null,
          venue: venue
        })

    if (error) {
      console.log(
        'Create event error:',
        error.message
      )

      setEventMessage(
        'Event haikuweza kuhifadhiwa: ' +
        error.message
      )

      return
    }

    setEventName('')
    setEventType('')
    setEventDescription('')
    setEventDate('')
    setEventTime('')
    setVenue('')

    setEventMessage(
      'Event imehifadhiwa vizuri. 🎉'
    )

    await loadEvents()
    setPage('events')
  }

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setPage('dashboard')
  }

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="app">
        <div className="card">
          <h2>ForteEvents</h2>
          <p>Inapakia...</p>
        </div>
      </div>
    )
  }

  // =========================
  // LOGIN SCREEN
  // =========================
  if (!session) {
    return (
      <div className="app">
        <div className="card auth-card">

          <img
            src="/ForteEvents-logo-dashboard.png"
            alt="ForteEvents"
            className="auth-logo"
          />

          <h1>
            {mode === 'login'
              ? 'Karibu ForteEvents'
              : 'Create Account'}
          </h1>

          <form onSubmit={submit}>

            {mode === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder="Jina kamili"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                />

                <input
                  type="text"
                  placeholder="Namba ya simu"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button type="submit">
              {mode === 'login'
                ? 'Login'
                : 'Create Account'}
            </button>

          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <button
            className="link-button"
            onClick={() => {
              setMode(
                mode === 'login'
                  ? 'signup'
                  : 'login'
              )
              setMessage('')
            }}
          >
            {mode === 'login'
              ? 'Create Account'
              : 'Already have an account? Login'}
          </button>

        </div>
      </div>
    )
  }

  // =========================
  // MAIN APP
  // =========================
  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="sidebar-logo">
          <img
            src="/ForteEvents-logo-dashboard.png"
            alt="ForteEvents"
          />
        </div>

        <button
          className={
            page === 'dashboard'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() =>
            setPage('dashboard')
          }
        >
          Dashboard
        </button>

        <button
          className={
            page === 'create'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => {
            setPage('create')
            setEventMessage('')
          }}
        >
          + Create Event
        </button>

        <button
          className={
            page === 'events'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => {
            setPage('events')
            loadEvents()
          }}
        >
          My Events
        </button>

        <button
          className={
            page === 'sms'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => setPage('sms')}
        >
          SMS
        </button>

        <div className="sidebar-bottom">
          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>

      </aside>

      <main className="main-content">

        {/* DASHBOARD */}
        {page === 'dashboard' && (
          <>
            <img
              src="/ForteEvents-logo-dashboard.png"
              alt="ForteEvents"
              className="dashboard-logo"
            />

            <h1>Dashboard</h1>

            <div className="card">

              <h2>
                Karibu,{' '}
                {profile?.full_name ||
                  session.user.user_metadata?.full_name ||
                  'Mteja'}{' '}
                👋
              </h2>

              <p>
                Email:{' '}
                {profile?.email ||
                  session.user.email}
              </p>

              <p>
                Simu:{' '}
                {profile?.phone ||
                  session.user.user_metadata?.phone ||
                  'Haijawekwa'}
              </p>

              <p>
                SMS Balance:{' '}
                {profile?.sms_balance ?? 0}
              </p>

            </div>
          </>
        )}

        {/* CREATE EVENT */}
        {page === 'create' && (
          <>
            <h1>Create Event</h1>

            <div className="card">

              <form onSubmit={createEvent}>

                <label>
                  Event Name
                </label>

                <input
                  type="text"
                  placeholder="Mfano: Harusi ya John na Mary"
                  value={eventName}
                  onChange={(e) =>
                    setEventName(e.target.value)
                  }
                  required
                />

                <label>
                  Event Type
                </label>

                <input
                  type="text"
                  placeholder="Mfano: Wedding / Birthday"
                  value={eventType}
                  onChange={(e) =>
                    setEventType(e.target.value)
                  }
                />

                <label>
                  Description
                </label>

                <textarea
                  placeholder="Maelezo ya event"
                  value={eventDescription}
                  onChange={(e) =>
                    setEventDescription(
                      e.target.value
                    )
                  }
                />

                <label>
                  Date
                </label>

                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) =>
                    setEventDate(e.target.value)
                  }
                  required
                />

                <label>
                  Time
                </label>

                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) =>
                    setEventTime(e.target.value)
                  }
                />

                <label>
                  Venue
                </label>

                <input
                  type="text"
                  placeholder="Mfano: Dodoma"
                  value={venue}
                  onChange={(e) =>
                    setVenue(e.target.value)
                  }
                />

                <button type="submit">
                  Save Event
                </button>

              </form>

              {eventMessage && (
                <p className="message">
                  {eventMessage}
                </p>
              )}

            </div>
          </>
        )}

        {/* MY EVENTS */}
        {page === 'events' && (
          <>
            <h1>My Events</h1>

            {eventsLoading ? (
              <div className="card">
                <p>
                  Inapakia events...
                </p>
              </div>
            ) : events.length === 0 ? (
              <div className="card">
                <p>
                  Bado hujaweka event yoyote.
                </p>
              </div>
            ) : (
              <div className="events-list">

                {events.map((event) => (
                  <div
                    className="card event-card"
                    key={event.id}
                  >

                    <h2>
                      {event.event_name}
                    </h2>

                    <p>
                      <strong>Aina:</strong>{' '}
                      {event.event_type || '-'}
                    </p>

                    <p>
                      <strong>Tarehe:</strong>{' '}
                      {event.event_date || '-'}
                    </p>

                    <p>
                      <strong>Muda:</strong>{' '}
                      {event.event_time || '-'}
                    </p>

                    <p>
                      <strong>Mahali:</strong>{' '}
                      {event.venue || '-'}
                    </p>

                    <p>
                      <strong>Maelezo:</strong>{' '}
                      {event.description || '-'}
                    </p>

                  </div>
                ))}

              </div>
            )}

          </>
        )}

        {/* SMS - TUTAANZA HAPA BAADAYE */}
        {page === 'sms' && (
          <>
            <h1>SMS</h1>

            <div className="card">
              <p>
                Mfumo wa SMS tunaujenga hatua kwa hatua.
              </p>

              <p>
                SMS Balance:{' '}
                {profile?.sms_balance ?? 0}
              </p>
            </div>
          </>
        )}

      </main>
    </div>
  )
}

export default App