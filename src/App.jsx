import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function AdminCustomers({ session, onBack }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const response = await fetch(
          'https://forteevents.onrender.com/api/admin/customers',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        const result = await response.json()

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ||
              'Customers hawakuweza kupakiwa.'
          )
        }

        setCustomers(result.customers || [])
      } catch (error) {
        console.log(
          'Admin customers error:',
          error.message
        )

        setErrorMessage(
          'Customers hawakuweza kupakiwa: ' +
            error.message
        )

        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    if (session?.access_token) {
      loadCustomers()
    }
  }, [session])

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>
            Usimamizi wa customers wa ForteEvents.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <p>Inapakia customers...</p>
        </div>
      ) : errorMessage ? (
        <div className="card">
          <h3>Customer Management</h3>
          <p className="message">
            {errorMessage}
          </p>

          <button
            className="primary-button"
            onClick={onBack}
          >
            Back to Dashboard
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="card">
          <h3>Hakuna customers</h3>
          <p>
            Hakuna customer account iliyopatikana
            kwa sasa.
          </p>

          <button
            className="primary-button"
            onClick={onBack}
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="card">
          <h2>Customer Management</h2>

          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginTop: '20px',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                    }}
                  >
                    Customer Name
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                    }}
                  >
                    Email
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                    }}
                  >
                    Phone
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                    }}
                  >
                    SMS Balance
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '10px',
                    }}
                  >
                    Customer Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ padding: '10px' }}>
                      {customer.full_name || '-'}
                    </td>

                    <td style={{ padding: '10px' }}>
                      {customer.email || '-'}
                    </td>

                    <td style={{ padding: '10px' }}>
                      {customer.phone || '-'}
                    </td>

                    <td style={{ padding: '10px' }}>
                      <strong>
                        {customer.sms_balance ?? 0}
                      </strong>
                    </td>

                    <td style={{ padding: '10px' }}>
                      Active
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="primary-button"
            style={{ marginTop: '20px' }}
            onClick={onBack}
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </>
  )
}
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
  const [profileLoading, setProfileLoading] = useState(false)

  const [page, setPage] = useState('dashboard')
  const [adminPage, setAdminPage] = useState('dashboard')

  // =========================
  // EVENT STATES
  // =========================
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
  // SMS STATES
  // =========================
  const [smsRecipients, setSmsRecipients] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsMessageStatus, setSmsMessageStatus] = useState('')
  const [smsBalance, setSmsBalance] = useState(0)

  // =========================
  // AUTH SESSION
  // =========================
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // =========================
  // LOGIN / SIGNUP
  // =========================
  const submit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (mode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
        return
      }

      setSession(data.session)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone,
        },
      },
    })

    if (error) {
      setMessage(error.message)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: name,
          phone: phone,
          email: email,
          sms_balance: 0,
        })

      if (profileError) {
        console.log('Profile error:', profileError.message)
      }
    }

    if (data.session) {
      setSession(data.session)
    } else {
      setMessage('Account imeundwa. Angalia email yako kuthibitisha.')
    }
  }

  // =========================
  // LOAD PROFILE
  // =========================
  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    const loadProfile = async () => {
      setProfileLoading(true)

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.log('Profile error:', error.message)
          setProfile(null)
          return
        }

        setProfile(data)

        // Admin hahitaji SMS balance endpoint ya customer
        if (data?.role !== 'admin') {
          try {
            const response = await fetch(
              'https://forteevents.onrender.com/api/sms/balance',
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            )

            const smsData = await response.json()

            if (smsData.ok) {
              setSmsBalance(smsData.balance ?? 0)
            }
          } catch (error) {
            console.log('SMS balance error:', error.message)
          }
        }
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [session])

  // =========================
  // LOAD CUSTOMER EVENTS
  // =========================
  const loadEvents = async () => {
    if (!session?.user?.id) return

    setEventsLoading(true)

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('Events error:', error.message)
      setEventMessage(error.message)
      setEvents([])
    } else {
      setEvents(data || [])
      setEventMessage('')
    }

    setEventsLoading(false)
  }

  useEffect(() => {
    if (session?.user?.id && profile?.role !== 'admin') {
      loadEvents()
    }
  }, [session, profile?.role])

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

    const { error } = await supabase
      .from('events')
      .insert({
        user_id: session.user.id,
        event_name: eventName,
        event_type: eventType,
        description: eventDescription,
        event_date: eventDate,
        event_time: eventTime || null,
        venue: venue,
      })

    if (error) {
      console.log('Create event error:', error.message)
      setEventMessage(
        'Event haikuweza kuhifadhiwa: ' + error.message
      )
      return
    }

    setEventName('')
    setEventType('')
    setEventDescription('')
    setEventDate('')
    setEventTime('')
    setVenue('')

    setEventMessage('Event imehifadhiwa vizuri. 🎉')

    await loadEvents()

    setPage('events')
  }

  // =========================
  // SEND SMS
  // =========================
  const sendSms = async (e) => {
    e.preventDefault()

    setSmsMessageStatus('')

    if (!smsRecipients.trim()) {
      setSmsMessageStatus('Tafadhali weka namba za wapokeaji.')
      return
    }

    if (!smsMessage.trim()) {
      setSmsMessageStatus('Tafadhali andika ujumbe.')
      return
    }

    const recipients = smsRecipients
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)

    if (recipients.length === 0) {
      setSmsMessageStatus('Hakuna namba sahihi zilizowekwa.')
      return
    }

    if (recipients.length > smsBalance) {
      setSmsMessageStatus(
        `SMS credits hazitoshi. Una ${smsBalance} credits lakini unahitaji ${recipients.length}.`
      )
      return
    }

    setSmsSending(true)

    try {
      const response = await fetch(
        'https://forteevents.onrender.com/api/sms/send',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipients,
            message: smsMessage,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        setSmsMessageStatus(
          data.message || 'SMS haikutumwa.'
        )
        return
      }

      setSmsMessageStatus(
        data.message || 'SMS imetumwa vizuri.'
      )

      setSmsRecipients('')
      setSmsMessage('')

      if (typeof data.balance === 'number') {
        setSmsBalance(data.balance)

        setProfile((current) =>
          current
            ? {
                ...current,
                sms_balance: data.balance,
              }
            : current
        )
      } else {
        const balanceResponse = await fetch(
          'https://forteevents.onrender.com/api/sms/balance',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        )

        const balanceData = await balanceResponse.json()

        if (balanceData.ok) {
          setSmsBalance(balanceData.balance ?? 0)

          setProfile((current) =>
            current
              ? {
                  ...current,
                  sms_balance: balanceData.balance ?? 0,
                }
              : current
          )
        }
      }
    } catch (error) {
      console.log('SMS error:', error.message)
      setSmsMessageStatus(
        'Tatizo la connection. Tafadhali jaribu tena.'
      )
    } finally {
      setSmsSending(false)
    }
  }

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
    await supabase.auth.signOut()

    setSession(null)
    setProfile(null)
    setPage('dashboard')
    setAdminPage('dashboard')
    setSmsBalance(0)
    setEvents([])
  }

  // =========================
  // INITIAL LOADING
  // =========================
  if (loading) {
    return (
      <div className="app-loading">
        <h2>ForteEvents</h2>
        <p>Inapakia...</p>
      </div>
    )
  }

  // =========================
  // LOGIN / SIGNUP SCREEN
  // =========================
  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="logo-area">
            <div className="logo-circle">
              <div className="logo-forte">Forte</div>
              <div className="logo-events">Events</div>
            </div>

            <p className="logo-tagline">
              make your event extraordinary
            </p>
          </div>

          <h2>
            {mode === 'login'
              ? 'Karibu ForteEvents'
              : 'Create Account'}
          </h2>

          <p>
            {mode === 'login'
              ? 'Ingia kwenye akaunti yako'
              : 'Tengeneza akaunti yako ya ForteEvents'}
          </p>

          <form onSubmit={submit}>
            {mode === 'signup' && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  type="text"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </>
            )}

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" className="primary-button">
              {mode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <button
            type="button"
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
              ? 'Create new account'
              : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    )
  }

  // =========================
  // PROFILE LOADING
  // =========================
  if (profileLoading) {
    return (
      <div className="app-loading">
        <h2>ForteEvents</h2>
        <p>Inapakia taarifa za akaunti...</p>
      </div>
    )
  }

  // ==========================================================
  // ADMIN DASHBOARD
  // ==========================================================
  if (profile?.role === 'admin') {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-circle">
              <div className="logo-forte">Forte</div>
              <div className="logo-events">Events</div>
            </div>

            <p className="logo-tagline">
              make your event extraordinary
            </p>
          </div>

          <div className="sidebar-nav">
            <button
              className={
                adminPage === 'dashboard'
                  ? 'nav-button active'
                  : 'nav-button'
              }
              onClick={() =>
                setAdminPage('dashboard')
              }
            >
              Dashboard
            </button>

            <button
              className={
                adminPage === 'customers'
                  ? 'nav-button active'
                  : 'nav-button'
              }
              onClick={() =>
                setAdminPage('customers')
              }
            >
              Customers
            </button>
          </div>

          <div className="sidebar-bottom">
            <button
              className="nav-button logout-button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="main-content">
          {adminPage === 'dashboard' && (
            <>
              <div className="page-header">
                <div>
                  <h1>Admin Dashboard</h1>
                  <p>
                    Karibu kwenye usimamizi wa ForteEvents.
                  </p>
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card">
                  <h3>Administrator</h3>
                  <p className="big-number">ADMIN</p>
                  <p>
                    Akaunti hii ina ruhusa za admin.
                  </p>
                </div>

                <div className="card">
                  <h3>Admin Email</h3>
                  <p>
                    {profile?.email ||
                      session?.user?.email ||
                      '-'}
                  </p>
                </div>

                <div className="card">
                  <h3>Customer Management</h3>
                  <p>
                    Hapa tutasimamia accounts za
                    customers na SMS credits.
                  </p>

                  <button
                    className="primary-button"
                    onClick={() =>
                      setAdminPage('customers')
                    }
                  >
                    Manage Customers
                  </button>
                </div>

                <div className="card">
                  <h3>System</h3>
                  <p>
                    ForteEvents backend iko online
                    na SMS service imeunganishwa.
                  </p>
                </div>
              </div>

              <div className="card" style={{ marginTop: '20px' }}>
                <h2>Admin Area</h2>

                <p>
                  Hatua hii imeweka mfumo wa kutenganisha
                  Admin Dashboard na Customer Dashboard.
                </p>

                <p>
                  Hatua inayofuata ni kuunganisha hapa
                  <strong> orodha ya customers, SMS balances,
                  na kuongeza credits</strong> kupitia
                  backend yenye admin authorization.
                </p>
              </div>
            </>
          )}

{adminPage === 'customers' && (
 <AdminCustomers
  session={session}
  onBack={() => setAdminPage('dashboard')}
/>
)}
        </main>
      </div>
    )
  }

// ==========================================================
// CUSTOMER DASHBOARD
// ==========================================================
return (
  <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-circle">
          <div className="logo-forte">Forte</div>
          <div className="logo-events">Events</div>
        </div>

        <p className="logo-tagline">
          make your event extraordinary
        </p>
      </div>

      <div className="sidebar-nav">
        <button
          className={
            page === 'dashboard'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => setPage('dashboard')}
        >
          Dashboard
        </button>

        <button
          className={
            page === 'create'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => setPage('create')}
        >
          + Create Event
        </button>

        <button
          className={
            page === 'events'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => setPage('events')}
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
      </div>

      <div className="sidebar-bottom">
        <button
          className="nav-button logout-button"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </aside>

    <main className="main-content">

      {/* =========================
          CUSTOMER DASHBOARD
      ========================= */}
      {page === 'dashboard' && (
        <>
          <div className="page-header">
            <div>
              <h1>
                Karibu, {profile?.full_name || 'Customer'} 👋
              </h1>

              <p>
                Simamia events zako na SMS kwa urahisi.
              </p>
            </div>
          </div>

          <div className="dashboard-grid">

            <div className="card">
              <h3>Account</h3>

              <p>
                <strong>Email:</strong>{' '}
                {profile?.email ||
                  session?.user?.email ||
                  '-'}
              </p>

              <p>
                <strong>Phone:</strong>{' '}
                {profile?.phone || '-'}
              </p>
            </div>

            <div className="card">
              <h3>SMS Balance</h3>

              <p className="big-number">
                {smsBalance}
              </p>

              <p>
                SMS credits zilizobaki.
              </p>
            </div>

            <div className="card">
              <h3>My Events</h3>

              <p className="big-number">
                {events.length}
              </p>

              <p>
                Events zako zilizohifadhiwa.
              </p>

              <button
                className="primary-button"
                onClick={() => setPage('events')}
              >
                View Events
              </button>
            </div>

          </div>
        </>
      )}

      {/* =========================
          CREATE EVENT
      ========================= */}
      {page === 'create' && (
        <>
          <div className="page-header">
            <div>
              <h1>Create Event</h1>

              <p>
                Tengeneza event yako hapa.
              </p>
            </div>
          </div>

          <div className="card">
            <form onSubmit={createEvent}>

              <input
                type="text"
                placeholder="Event Name"
                value={eventName}
                onChange={(e) =>
                  setEventName(e.target.value)
                }
                required
              />

              <input
                type="text"
                placeholder="Event Type"
                value={eventType}
                onChange={(e) =>
                  setEventType(e.target.value)
                }
              />

              <textarea
                placeholder="Event Description"
                value={eventDescription}
                onChange={(e) =>
                  setEventDescription(e.target.value)
                }
                rows="4"
              />

              <input
                type="date"
                value={eventDate}
                onChange={(e) =>
                  setEventDate(e.target.value)
                }
                required
              />

              <input
                type="time"
                value={eventTime}
                onChange={(e) =>
                  setEventTime(e.target.value)
                }
              />

              <input
                type="text"
                placeholder="Venue"
                value={venue}
                onChange={(e) =>
                  setVenue(e.target.value)
                }
              />

              <button
                type="submit"
                className="primary-button"
              >
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

      {/* =========================
          MY EVENTS
      ========================= */}
      {page === 'events' && (
        <>
          <div className="page-header">
            <div>
              <h1>My Events</h1>

              <p>
                Events zako zote zilizohifadhiwa.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => setPage('create')}
            >
              + Create Event
            </button>
          </div>

          {eventsLoading ? (
            <div className="card">
              <p>Inapakia events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="card">
              <h3>Hakuna events bado</h3>

              <p>
                Tengeneza event yako ya kwanza.
              </p>

              <button
                className="primary-button"
                onClick={() => setPage('create')}
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="events-list">

              {events.map((event) => (
                <div
                  className="card"
                  key={event.id}
                >
                  <h2>
                    {event.event_name}
                  </h2>

                  {event.event_type && (
                    <p>
                      <strong>Type:</strong>{' '}
                      {event.event_type}
                    </p>
                  )}

                  {event.description && (
                    <p>
                      <strong>Description:</strong>{' '}
                      {event.description}
                    </p>
                  )}

                  <p>
                    <strong>Date:</strong>{' '}
                    {event.event_date}
                  </p>

                  {event.event_time && (
                    <p>
                      <strong>Time:</strong>{' '}
                      {event.event_time}
                    </p>
                  )}

                  {event.venue && (
                    <p>
                      <strong>Venue:</strong>{' '}
                      {event.venue}
                    </p>
                  )}
                </div>
              ))}

            </div>
          )}
        </>
      )}

      {/* =========================
          SMS
      ========================= */}
      {page === 'sms' && (
        <>
          <div className="page-header">
            <div>
              <h1>SMS</h1>

              <p>
                Tuma SMS kwa wageni wako kupitia
                ForteEvents.
              </p>
            </div>
          </div>

          <div className="dashboard-grid">

            <div className="card">
              <h3>SMS Balance</h3>

              <p className="big-number">
                {smsBalance}
              </p>

              <p>
                SMS credits zilizopo kwenye akaunti yako.
              </p>
            </div>

          </div>

          <div className="card">
            <form onSubmit={sendSms}>

              <label>
                Recipients
              </label>

              <textarea
                placeholder={
                  'Weka namba moja kwa kila mstari\nMfano:\n255712345678\n255713456789'
                }
                value={smsRecipients}
                onChange={(e) =>
                  setSmsRecipients(e.target.value)
                }
                rows="7"
              />

              <label>
                Message
              </label>

              <textarea
                placeholder="Andika ujumbe wako hapa..."
                value={smsMessage}
                onChange={(e) =>
                  setSmsMessage(e.target.value)
                }
                rows="6"
              />

              <button
                type="submit"
                className="primary-button"
                disabled={smsSending}
              >
                {smsSending
                  ? 'Inatuma...'
                  : 'Send SMS'}
              </button>

            </form>

            {smsMessageStatus && (
              <p className="message">
                {smsMessageStatus}
              </p>
            )}
          </div>
        </>
      )}

    </main>
  </div>
)

}

export default App