import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function AdminCustomers({ session, onBack }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [smsHistory, setSmsHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
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

  const loadSmsHistory = async (customer) => {
    setHistoryLoading(true)
    setHistoryError('')
    setSmsHistory([])

    try {
      const response = await fetch(
        `https://forteevents.onrender.com/api/admin/customers/${customer.id}/sms-history`,
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
            'SMS history haikuweza kupakiwa.'
        )
      }

      setSmsHistory(result.history || [])
    } catch (error) {
      console.log(
        'SMS history error:',
        error.message
      )

      setHistoryError(
        'SMS history haikuweza kupakiwa: ' +
          error.message
      )

      setSmsHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer)
    loadSmsHistory(customer)
  }

  const addCredits = async (customer) => {
    const amount = window.prompt(
      `Ongeza SMS credits kwa ${
        customer.full_name ||
        customer.email
      }:`
    )

    if (!amount) {
      return
    }

    const creditAmount = Number(amount)

    if (
      !Number.isFinite(creditAmount) ||
      creditAmount <= 0
    ) {
      window.alert(
        'Tafadhali weka idadi sahihi ya SMS credits.'
      )
      return
    }

    try {
      const response = await fetch(
        'https://forteevents.onrender.com/api/admin/credits/add',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userId: customer.id,
            amount: creditAmount,
            reference: 'Admin credit',
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            'Credits hazikuweza kuongezwa.'
        )
      }

      window.alert(
        `Credits zimeongezwa successfully.\nBalance mpya: ${result.balance}`
      )

      setCustomers((currentCustomers) =>
        currentCustomers.map((item) =>
          item.id === customer.id
            ? {
                ...item,
                sms_balance: result.balance,
              }
            : item
        )
      )

      setSelectedCustomer((currentCustomer) =>
        currentCustomer &&
        currentCustomer.id === customer.id
          ? {
              ...currentCustomer,
              sms_balance: result.balance,
            }
          : currentCustomer
      )
    } catch (error) {
      console.log(
        'Add credits error:',
        error.message
      )

      window.alert(
        'Imeshindikana kuongeza credits: ' +
          error.message
      )
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p>Inapakia customers...</p>
      </div>
    )
  }

  if (selectedCustomer) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>Customer Details</h1>
            <p>
              Taarifa za customer wa ForteEvents.
            </p>
          </div>
        </div>

        <div className="card">
          <h2>
            {selectedCustomer.full_name ||
              'Customer'}
          </h2>

          <div
            style={{
              marginTop: '20px',
              lineHeight: '1.9',
            }}
          >
            <p>
              <strong>Full Name:</strong>{' '}
              {selectedCustomer.full_name || '-'}
            </p>

            <p>
              <strong>Email:</strong>{' '}
              {selectedCustomer.email || '-'}
            </p>

            <p>
              <strong>Phone:</strong>{' '}
              {selectedCustomer.phone || '-'}
            </p>

            <p>
              <strong>SMS Balance:</strong>{' '}
              <strong>
                {selectedCustomer.sms_balance ?? 0}
              </strong>
            </p>

            <p>
              <strong>Status:</strong> Active
            </p>
          </div>

          <div
            style={{
              marginTop: '25px',
              padding: '18px',
              border: '1px solid #ddd',
              borderRadius: '10px',
              overflowX: 'auto',
            }}
          >
            <h3>SMS History</h3>

            {historyLoading && (
              <p>
                Inapakia SMS history...
              </p>
            )}

            {historyError && (
              <p
                style={{
                  color: '#b00020',
                }}
              >
                {historyError}
              </p>
            )}

            {!historyLoading &&
              !historyError &&
              smsHistory.length === 0 && (
                <p>
                  Hakuna SMS history kwa customer
                  huyu.
                </p>
              )}

            {!historyLoading &&
              !historyError &&
              smsHistory.length > 0 && (
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginTop: '15px',
                  }}
                >
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px',
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        Date
                      </th>

                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px',
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        Recipient
                      </th>

                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px',
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        Message
                      </th>

                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px',
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        SMS
                      </th>

                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px',
                          borderBottom: '1px solid #ddd',
                        }}
                      >
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {smsHistory.map((item) => (
                      <tr key={item.id}>
                        <td
                          style={{
                            padding: '10px',
                            borderBottom:
                              '1px solid #eee',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.sent_at
                            ? new Date(
                                item.sent_at
                              ).toLocaleString()
                            : '-'}
                        </td>

                        <td
                          style={{
                            padding: '10px',
                            borderBottom:
                              '1px solid #eee',
                          }}
                        >
                          {item.recipient || '-'}
                        </td>

                        <td
                          style={{
                            padding: '10px',
                            borderBottom:
                              '1px solid #eee',
                            minWidth: '220px',
                          }}
                        >
                          {item.message || '-'}
                        </td>

                        <td
                          style={{
                            padding: '10px',
                            borderBottom:
                              '1px solid #eee',
                          }}
                        >
                          {item.sms_count ?? 0}
                        </td>

                        <td
                          style={{
                            padding: '10px',
                            borderBottom:
                              '1px solid #eee',
                          }}
                        >
                          {item.status || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              marginTop: '25px',
            }}
          >
            <button
              className="primary-button"
              onClick={() =>
                addCredits(selectedCustomer)
              }
            >
              Add Credits
            </button>

            <button
              className="secondary-button"
              onClick={() => {
                setSelectedCustomer(null)
                setSmsHistory([])
                setHistoryError('')
              }}
            >
              Back to Customers
            </button>

            <button
              className="secondary-button"
              onClick={onBack}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>
            Manage ForteEvents customers and
            their SMS credits.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="card">
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="card">
        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  Customer Name
                </th>

                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  Email
                </th>

                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  Phone
                </th>

                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  SMS Balance
                </th>

                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  Status
                </th>

                <th
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderBottom: '1px solid #ddd',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openCustomerDetails(
                          customer
                        )
                      }
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: 0,
                        color: '#8a6d1d',
                        cursor: 'pointer',
                        fontWeight: '700',
                        textDecoration: 'underline',
                      }}
                    >
                      {customer.full_name ||
                        'Customer'}
                    </button>
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    {customer.email || '-'}
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    {customer.phone || '-'}
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    {customer.sms_balance ?? 0}
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    Active
                  </td>

                  <td
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <button
                      className="primary-button"
                      onClick={() =>
                        addCredits(customer)
                      }
                    >
                      Add Credits
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 &&
          !errorMessage && (
            <p
              style={{
                marginTop: '20px',
              }}
            >
              Hakuna customers kwa sasa.
            </p>
          )}
      </div>
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
  const [scrollToFlyer, setScrollToFlyer] = useState(false)

  useEffect(() => {
    if (page !== 'dashboard' || !scrollToFlyer) {
      return
    }

    const timer = setTimeout(() => {
      const flyer = document.getElementById('bulk-sms-flyer')

      if (flyer) {
        flyer.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [page, scrollToFlyer])

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

  // CONTRIBUTIONS
  const [contributionEvent, setContributionEvent] = useState(null)
  const [contributors, setContributors] = useState([])
  const [contributorsLoading, setContributorsLoading] = useState(false)
  const [contributorName, setContributorName] = useState('')
  const [contributorPhone, setContributorPhone] = useState('')
  const [pledgedAmount, setPledgedAmount] = useState('')
  const [paidAmount, setPaidAmount] = useState('0')
  const [contributorNotes, setContributorNotes] = useState('')
  const [editingContributorId, setEditingContributorId] = useState(null)
  const [contributionStatus, setContributionStatus] = useState('')
  const [contributionSaving, setContributionSaving] = useState(false)
  const [contributionSmsMode, setContributionSmsMode] = useState('all')
  const [contributionSmsMessage, setContributionSmsMessage] = useState(
    'Habari {jina}, tunakukumbusha kuhusu mchango wako wa event.'
  )
  const [contributionSmsStatus, setContributionSmsStatus] = useState('')
  const [contributionSmsSending, setContributionSmsSending] = useState(false)

  // =========================
  // SMS STATES
  // =========================
  const [smsRecipients, setSmsRecipients] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [smsSending, setSmsSending] = useState(false)
  const [smsMessageStatus, setSmsMessageStatus] = useState('')
  const [smsHistory, setSmsHistory] = useState([])
  const [smsBalance, setSmsBalance] = useState(0)
  const [csvFile, setCsvFile] = useState(null)
  // SMS CONTACTS STATES
  const [smsContacts, setSmsContacts] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsSaving, setContactsSaving] = useState(false);
  const [contactsStatus, setContactsStatus] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState([]);


  // SCHEDULED SMS STATES
  const [scheduledAt, setScheduledAt] = useState('')
  const [schedulingSms, setSchedulingSms] = useState(false)
  const [scheduledSmsStatus, setScheduledSmsStatus] = useState('')
  const [smsSchedules, setSmsSchedules] = useState([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)

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
  const forgotPassword = async () => {
    if (!email) {
      setMessage('Weka email yako kwanza.')
      return
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://forteevents-web.onrender.com',
      })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      'Tumetuma link ya kubadilisha password kwenye email yako.'
    )
  }

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
          role: 'customer',
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
// CONTRIBUTION SMS
const sendContributionSms = async () => {
  setContributionSmsStatus('')

  if (!contributionEvent || !session?.access_token) {
    setContributionSmsStatus('Tafadhali ingia tena na uchague event.')
    return
  }

  const eligible = contributors.filter((item) => {
    if (!item.phone?.trim()) return false
    if (contributionSmsMode === 'balance') {
      return Number(item.pledged_amount || 0) > Number(item.paid_amount || 0)
    }
    return true
  })

  if (eligible.length === 0) {
    setContributionSmsStatus(
      contributionSmsMode === 'balance'
        ? 'Hakuna wenye salio wenye namba za simu.'
        : 'Hakuna wachangiaji wenye namba za simu.'
    )
    return
  }

  const recipients = eligible.map((item) => {
    const pledged = Number(item.pledged_amount || 0)
    const paid = Number(item.paid_amount || 0)
    const balance = Math.max(0, pledged - paid)

    let message = contributionSmsMessage
      .replaceAll('{jina}', item.full_name || '')
      .replaceAll('{ahadi}', pledged.toLocaleString())
      .replaceAll('{amelipa}', paid.toLocaleString())
      .replaceAll('{salio}', balance.toLocaleString())
      .replaceAll('{event}', contributionEvent.event_name || '')

    if (contributionSmsMode === 'personal') {
      message =
        'Habari ' + item.full_name +
        ', event: ' + (contributionEvent.event_name || '') +
        '. Ahadi yako ni TZS ' + pledged.toLocaleString() +
        ', umelipa TZS ' + paid.toLocaleString() +
        ', salio TZS ' + balance.toLocaleString() +
        '. Asante kwa mchango wako.'
    }

    return {
      name: item.full_name,
      phone: item.phone.trim(),
      message,
    }
  })

  const creditsNeeded = recipients.reduce(
    (sum, item) => sum + Math.max(1, Math.ceil(item.message.length / 160)),
    0
  )

  if (creditsNeeded > Number(smsBalance || 0)) {
    setContributionSmsStatus(
      'Salio la SMS halitoshi. Unahitaji angalau ' +
      creditsNeeded + ' credits; salio lako ni ' + smsBalance + '.'
    )
    return
  }

  const modeLabel = {
    all: 'wachangiaji wote',
    balance: 'wenye salio',
    personal: 'ujumbe binafsi',
  }[contributionSmsMode]

  if (!window.confirm(
    'Unakaribia kutuma SMS kwa ' + recipients.length +
    ' wapokeaji (' + modeLabel + '). Endelea?'
  )) return

  setContributionSmsSending(true)

  try {
    const response = await fetch(
      'https://forteevents.onrender.com/api/sms/send',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + session.access_token,
        },
        body: JSON.stringify({
          recipients: recipients.map((item) => ({
            name: item.name,
            phone: item.phone,
          })),
          message: recipients[0].message,
          personalizedMessages: recipients.map((item) => ({
            phone: item.phone,
            message: item.message,
          })),
          eventId: contributionEvent.id,
          eventName: contributionEvent.event_name,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok || !data.ok) {
      setContributionSmsStatus(
        data.message || 'SMS hazikutumwa. Hakuna uthibitisho wa mafanikio.'
      )
      return
    }

    setContributionSmsStatus(
      data.message || 'Ombi la kutuma SMS limepokelewa.'
    )

    if (typeof data.balance === 'number') {
      setSmsBalance(data.balance)
      setProfile((current) =>
        current ? { ...current, sms_balance: data.balance } : current
      )
    } else {
      const balanceResponse = await fetch(
        'https://forteevents.onrender.com/api/sms/balance',
        { headers: { Authorization: 'Bearer ' + session.access_token } }
      )
      const balanceData = await balanceResponse.json()
      if (balanceData.ok) {
        setSmsBalance(balanceData.balance ?? 0)
        setProfile((current) =>
          current ? { ...current, sms_balance: balanceData.balance ?? 0 } : current
        )
      }
    }
  } catch (error) {
    setContributionSmsStatus('Tatizo la connection. Jaribu tena.')
  } finally {
    setContributionSmsSending(false)
  }
}

// CONTRIBUTIONS FUNCTIONS
const loadContributors = async (eventId) => {
  if (!session?.user?.id || !eventId) return

  setContributorsLoading(true)
  const { data, error } = await supabase
    .from('event_contributors')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    setContributionStatus('Imeshindikana kupakia wachangiaji: ' + error.message)
    setContributors([])
  } else {
    setContributors(data || [])
  }

  setContributorsLoading(false)
}

const openContributions = async (event) => {
  setContributionEvent(event)
  setContributors([])
  setContributionStatus('')
  setContributorName('')
  setContributorPhone('')
  setPledgedAmount('')
  setPaidAmount('0')
  setContributorNotes('')
  setEditingContributorId(null)
  setPage('contributions')
  await loadContributors(event.id)
}

const saveContributor = async (e) => {
  e.preventDefault()
  setContributionStatus('')

  if (!contributionEvent || !contributorName.trim()) {
    setContributionStatus('Weka jina la mchangiaji.')
    return
  }

  const pledged = Number(pledgedAmount || 0)
  const paid = Number(paidAmount || 0)

  if (
    !Number.isFinite(pledged) ||
    !Number.isFinite(paid) ||
    pledged < 0 ||
    paid < 0 ||
    paid > pledged
  ) {
    setContributionStatus('Thibitisha kiasi. Malipo hayawezi kuzidi ahadi.')
    return
  }

  setContributionSaving(true)

  if (editingContributorId && pledged < Number(contributors.find((item) => item.id === editingContributorId)?.paid_amount || 0)) {
    setContributionStatus('Ahadi haiwezi kuwa chini ya kiasi alicholipa tayari.')
    return
  }
  const payload = { full_name: contributorName.trim(), phone: contributorPhone.trim() || null, pledged_amount: pledged, notes: contributorNotes.trim() || null, updated_at: new Date().toISOString() }
  const query = editingContributorId
    ? supabase.from('event_contributors').update(payload).eq('id', editingContributorId).eq('event_id', contributionEvent.id).eq('user_id', session.user.id)
    : supabase.from('event_contributors').insert({ ...payload, event_id: contributionEvent.id, user_id: session.user.id, paid_amount: paid })
  const { error } = await query

  setContributionSaving(false)

  if (error) {
    setContributionStatus('Imeshindikana kuhifadhi: ' + error.message)
    return
  }

  setContributionStatus(editingContributorId ? 'Taarifa za mchangiaji zimesasishwa.' : 'Mchangiaji ameongezwa kikamilifu.')
  setEditingContributorId(null)
  setContributorName('')
  setContributorPhone('')
  setPledgedAmount('')
  setPaidAmount('0')
  setContributorNotes('')
  await loadContributors(contributionEvent.id)
}

const editContributor = (item) => {
  setEditingContributorId(item.id); setContributorName(item.full_name || ''); setContributorPhone(item.phone || '')
  setPledgedAmount(String(item.pledged_amount ?? 0)); setPaidAmount(String(item.paid_amount ?? 0)); setContributorNotes(item.notes || '')
  setContributionStatus('Unahariri mchangiaji. Kiasi alicholipa tayari hakitabadilishwa hapa.')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteContributor = async (item) => {
  if (!window.confirm('Una uhakika unataka kumfuta ' + item.full_name + '? Hii itaondoa pia rekodi ya malipo kwenye orodha hii.')) return
  const { error } = await supabase.from('event_contributors').delete().eq('id', item.id).eq('event_id', contributionEvent.id).eq('user_id', session.user.id)
  if (error) { setContributionStatus('Imeshindikana kufuta mchangiaji: ' + error.message); return }
  setContributionStatus('Mchangiaji amefutwa kwenye event hii.')
  if (editingContributorId === item.id) { setEditingContributorId(null); setContributorName(''); setContributorPhone(''); setPledgedAmount(''); setPaidAmount('0'); setContributorNotes('') }
  await loadContributors(contributionEvent.id)
}

const recordContributionPayment = async (item) => {
  const raw = window.prompt(
    'Ingiza kiasi cha malipo mapya kwa ' + item.full_name + ' (TZS):'
  )

  if (raw === null || !raw.trim()) return

  const amount = Number(raw)
  const oldPaid = Number(item.paid_amount || 0)
  const pledged = Number(item.pledged_amount || 0)

  if (!Number.isFinite(amount) || amount <= 0) {
    window.alert('Weka kiasi sahihi cha malipo.')
    return
  }

  if (oldPaid + amount > pledged) {
    window.alert('Malipo haya yanazidi salio la ahadi.')
    return
  }

  const { error } = await supabase
    .from('event_contributors')
    .update({
      paid_amount: oldPaid + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id)
    .eq('event_id', contributionEvent.id)
    .eq('user_id', session.user.id)

  if (error) {
    window.alert('Imeshindikana kurekodi malipo: ' + error.message)
    return
  }

  setContributionStatus('Malipo yamehifadhiwa.')
  await loadContributors(contributionEvent.id)
}

// LOAD CUSTOMER SMS HISTORY
// =========================
const loadSmsHistory = async () => {
  if (!session?.user?.id) return

  try {
    const response = await fetch(
      'https://forteevents.onrender.com/api/sms/history',
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    )

    const data = await response.json()

    if (data.ok) {
      setSmsHistory(data.history || [])
    } else {
      console.log(
        'SMS history error:',
        data.error
      )
      setSmsHistory([])
    }
  } catch (error) {
    console.log(
      'SMS history error:',
      error.message
    )
    setSmsHistory([])
  }
}

useEffect(() => {
  if (session?.user?.id && profile?.role !== 'admin') {
    loadSmsHistory()
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
  // CSV CONTACT IMPORT
  // =========================

  // SMS CONTACTS FUNCTIONS
  const loadSmsContacts = async () => {
    if (!session?.access_token) return;
    setContactsLoading(true);
    try {
      const response = await fetch(
        'https://forteevents.onrender.com/api/sms/contacts',
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Imeshindikana kupata contacts.');
      setSmsContacts(data.contacts || []);
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kupata contacts.');
    } finally {
      setContactsLoading(false);
    }
  };

  const saveSmsContact = async (e) => {
    e.preventDefault();
    setContactsStatus('');
    if (!contactName.trim() || !contactPhone.trim()) {
      setContactsStatus('Jaza jina na namba ya simu.');
      return;
    }
    setContactsSaving(true);
    try {
      const response = await fetch(
        'https://forteevents.onrender.com/api/sms/contacts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: contactName.trim(),
            phone: contactPhone.trim(),
          }),
        }
      );
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Seva imerudisha majibu yasiyoeleweka. Contact haijathibitishwa kuhifadhiwa; taarifa zako zimeachwa kwenye fomu.');
      }

      if (!response.ok || data?.ok !== true) {
        throw new Error(
          [data?.message, data?.details, data?.error]
            .filter(Boolean)
            .join(' — ') || 'Imeshindikana kuhifadhi contact. Taarifa zako zimeachwa kwenye fomu.'
        );
      }

      const savedContacts = Array.isArray(data.contacts) ? data.contacts : [];
      const savedContact = savedContacts.find(
        (item) => String(item.phone || '').trim() === contactPhone.trim()
      );

      if (!savedContact) {
        throw new Error('Seva haijathibitisha kuhifadhi contact. Taarifa zako hazijafutwa; jaribu tena baada ya kukagua muunganisho.');
      }

      setSmsContacts((previous) => {
        const withoutDuplicate = previous.filter(
          (item) => String(item.phone || '').trim() !== String(savedContact.phone || '').trim()
        );
        return [...withoutDuplicate, savedContact].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        );
      });
      setContactName('');
      setContactPhone('');
      setContactsStatus('Contact imehifadhiwa vizuri.');
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kuhifadhi contact.');
    } finally {
      setContactsSaving(false);
    }
  };

  const deleteSmsContact = async (id) => {
    if (!window.confirm('Una uhakika unataka kufuta contact hii?')) return;
    setContactsStatus('');
    try {
      const response = await fetch(
        `https://forteevents.onrender.com/api/sms/contacts/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || data.error || 'Imeshindikana kufuta contact.');
      setSmsContacts((previous) => previous.filter((contact) => String(contact.id) !== String(id)));
      setSelectedContactIds((previous) => previous.filter((contactId) => String(contactId) !== String(id)));
      setContactsStatus('Contact imefutwa.');
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kufuta contact.');
    }
  };

  const addSelectedContactsToRecipients = () => {
    const chosen = smsContacts.filter((contact) =>
      selectedContactIds.includes(String(contact.id))
    );
    if (!chosen.length) {
      setContactsStatus('Chagua contact angalau mmoja.');
      return;
    }
    const lines = chosen.map((contact) => `${contact.name || ''} | ${contact.phone}`);
    setSmsRecipients((previous) => {
      const existing = previous.trim();
      return existing ? existing + '\n' + lines.join('\n') : lines.join('\n');
    });
    setContactsStatus(`${chosen.length} contact zimeongezwa kwa wapokeaji.`);
  };

  const handleCsvUpload = (file) => {
    if (!file) return

    const reader = new FileReader()

    reader.onload = (event) => {
      const text = String(event.target?.result || '')

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)

      if (lines.length < 2) {
        setSmsMessageStatus('CSV haina contacts za kutosha.')
        return
      }

      const firstLine = lines[0]
        .split(',')
        .map((item) => item.trim().toLowerCase())

      const hasHeader =
        firstLine.includes('name') &&
        firstLine.includes('phone')

      const dataLines = hasHeader
        ? lines.slice(1)
        : lines

      const contacts = dataLines
        .map((line) => {
          const parts = line
            .split(',')
            .map((item) => item.trim())

          return {
            name: parts[0] || '',
            phone: parts[1] || '',
          }
        })
        .filter((item) => item.phone)

      if (contacts.length === 0) {
        setSmsMessageStatus(
          'Hakuna contacts sahihi zilizopatikana kwenye CSV.'
        )
        return
      }

      const recipientText = contacts
        .map((item) => {
          if (item.name) {
            return item.name + ' | ' + item.phone
          }

          return item.phone
        })
        .join('\n')

      setSmsRecipients(recipientText)

      setSmsMessageStatus(
        'CSV imeingizwa vizuri. Contacts ' +
        contacts.length +
        ' zimeongezwa.'
      )
    }

    reader.onerror = () => {
      setSmsMessageStatus('Imeshindikana kusoma CSV.')
    }

    reader.readAsText(file)
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
      .map((item) => {
        const parts = item.split('|')

        return {
          name: (parts[0] || '').trim(),
          phone: (parts[1] || '').trim(),
        }
      })
      .filter((item) => item.phone)

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

  // =========================
  // SCHEDULED SMS FUNCTIONS
  // =========================
  const loadSmsSchedules = async () => {
    if (!session?.access_token) return;
    setLoadingSchedules(true);
    try {
      const r = await fetch(
        'https://forteevents.onrender.com/api/sms/schedules',
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || d.error || 'Imeshindikana kupata ratiba.');
      setSmsSchedules(d.schedules || []);
    } catch (e) {
      setScheduledSmsStatus(e.message);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (page === 'sms' && session?.access_token) loadSmsSchedules();
    if (page === 'sms' && session?.access_token) loadSmsContacts();
  }, [page, session]);

  const scheduleSms = async (e) => {
    e.preventDefault();
    setScheduledSmsStatus('');

    if (!smsRecipients.trim() || !smsMessage.trim() || !scheduledAt) {
      setScheduledSmsStatus('Jaza wapokeaji, ujumbe, tarehe na muda.');
      return;
    }

    const recipients = smsRecipients.split(/[\n,]+/).map((line) => {
      const parts = line.split('|');
      return {
        name: parts.length > 1 ? parts[0].trim() : '',
        phone: parts.length > 1 ? parts.slice(1).join('|').trim() : parts[0].trim(),
      };
    }).filter((r) => r.phone);

    if (!recipients.length) {
      setScheduledSmsStatus('Weka angalau namba moja ya simu.');
      return;
    }
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      setScheduledSmsStatus('Chagua tarehe na muda wa baadaye.');
      return;
    }

    setSchedulingSms(true);
    try {
      const r = await fetch(
        'https://forteevents.onrender.com/api/sms/schedule',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipients,
            message: smsMessage.trim(),
            scheduledAt: new Date(scheduledAt).toISOString(),
          }),
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || d.error || 'Ratiba haijahifadhiwa.');
      setScheduledSmsStatus('Ratiba imehifadhiwa.');
      setScheduledAt('');
      await loadSmsSchedules();
    } catch (e) {
      setScheduledSmsStatus(e.message);
    } finally {
      setSchedulingSms(false);
    }
  };

  const cancelSmsSchedule = async (id) => {
    if (!window.confirm('Unataka kughairi ratiba hii?')) return;
    try {
      const r = await fetch(
        `https://forteevents.onrender.com/api/sms/schedules/${id}/cancel`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || d.error || 'Ratiba haijaghairiwa.');
      setScheduledSmsStatus('Ratiba imeghairiwa.');
      await loadSmsSchedules();
    } catch (e) {
      setScheduledSmsStatus(e.message);
    }
  };

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
          <div className="auth-logo">
  <img
    src="/forteevents-logo.png"
    alt="ForteEvents"
  />
</div>
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

            {mode === 'login' && (
              <button
                type="button"
                className="link-button"
                onClick={forgotPassword}
                style={{ marginBottom: '12px' }}
              >
                Forgot Password?
              </button>
            )}

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
  <img
    src="/forteevents-logo.png"
    alt="ForteEvents"
    className="dashboard-logo"
  />
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
      <div className="auth-logo">
  <img
    src="/forteevents-logo.png"
    alt="ForteEvents"
  />
</div>
      </div>

      <div className="sidebar-nav">
        <button
          className={
            page === 'dashboard'
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => {
            setPage('dashboard')
            setScrollToFlyer(false)
          }}
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

        
        <button
          className={
            scrollToFlyer
              ? 'nav-button active'
              : 'nav-button'
          }
          onClick={() => {
            setPage('dashboard')
            setScrollToFlyer(true)
          }}
        >
          How to Use
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

            <div className="card">
              <h3>Help &amp; Support</h3>

              <p>
                Unahitaji msaada kuhusu ForteEvents?
              </p>

              <button
                className="primary-button"
                onClick={() => {
                  document.getElementById('help-support-section')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
              >
                Open Help &amp; Support
              </button>
            </div>

          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3>SMS History</h3>

            {smsHistory.length === 0 ? (
              <p>
                Bado hujatuma SMS yoyote.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Recipient</th>
                      <th>Message</th>
                      <th>SMS</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {smsHistory.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.sent_at
                            ? new Date(item.sent_at).toLocaleString()
                            : '-'}
                        </td>
                        <td>{item.recipient || '-'}</td>
                        <td>{item.message || '-'}</td>
                        <td>{item.sms_count ?? 0}</td>
                        <td>{item.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3>Jinsi ya Kutumia Bulk SMS</h3>

            <p>
              Jifunze jinsi ya kutumia huduma ya Bulk SMS ya ForteEvents.
            </p>

            <img
              id="bulk-sms-flyer"
              src="/bulk-sms-flyer.png"
              alt="ForteEvents Bulk SMS"
              style={{
                width: '100%',
                maxWidth: '900px',
                display: 'block',
                margin: '16px auto 0',
                borderRadius: '10px',
              }}
            />
          </div>

<div className="card" style={{ marginTop: '24px' }}>
            <h3>Payment &amp; Pricing</h3>

            <img
              src="/payment-pricing-board.png"
              alt="ForteEvents Payment and SMS Pricing"
              style={{
                width: '100%',
                maxWidth: '900px',
                display: 'block',
                margin: '16px auto 0',
                borderRadius: '10px',
              }}
            />
          </div>

          {/* HELP_SUPPORT_WHATSAPP */}
          <div
            id="help-support-section"
            className="card"
            style={{ marginTop: '24px' }}
          >
            <h3>Help &amp; Support</h3>

            <p>
              Unahitaji msaada kuhusu ForteEvents? Wasiliana nasi kupitia WhatsApp.
            </p>

            <p>
              <strong>WhatsApp:</strong> +255 756 458 095
            </p>

            <a
              href="https://wa.me/255756458095?text=Habari%20ForteEvents%20Support%2C%20nahitaji%20msaada%20kuhusu%20ForteEvents."
              target="_blank"
              rel="noopener noreferrer"
              className="primary-button"
              style={{
                display: 'inline-block',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Chat with Us on WhatsApp
            </a>
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

                  <button
                    className="primary-button"
                    onClick={() => openContributions(event)}
                  >
                    Michango
                  </button>
                </div>
              ))}

            </div>
          )}
        </>
      )}

      {/* =========================
          MICHANGO
      ========================= */}
      {page === 'contributions' && (
        <>
          <div className="page-header">
            <div>
              <h1>Michango</h1>
              <p>{contributionEvent?.event_name || 'Event'}</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => setPage('events')}
            >
              Rudi kwenye Events
            </button>
          </div>

          <div className="card">
            <h2>{editingContributorId ? 'Hariri Mchangiaji' : 'Ongeza Mchangiaji'}</h2>
            <form onSubmit={saveContributor}>
              <label>Jina kamili *</label>
              <input
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="Jina la mchangiaji"
                required
              />

              <label>Namba ya simu</label>
              <input
                value={contributorPhone}
                onChange={(e) => setContributorPhone(e.target.value)}
                placeholder="Mfano: 07XXXXXXXX"
              />

              <label>Ahadi ya mchango (TZS) *</label>
              <input
                type="number"
                min="0"
                step="1"
                value={pledgedAmount}
                onChange={(e) => setPledgedAmount(e.target.value)}
                required
              />

              <label>{editingContributorId ? 'Kiasi alicholipa tayari (TZS) — hakibadilishwi hapa' : 'Kiasi alicholipa tayari (TZS)'}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                disabled={Boolean(editingContributorId)}
                required
              />

              <label>Maelezo (hiari)</label>
              <input
                value={contributorNotes}
                onChange={(e) => setContributorNotes(e.target.value)}
                placeholder="Maelezo ya ziada"
              />

              <button
                className="primary-button"
                type="submit"
                disabled={contributionSaving}
              >
                {contributionSaving ? 'Inahifadhi...' : editingContributorId ? 'Hifadhi Mabadiliko' : 'Hifadhi Mchangiaji'}
              </button>
              {editingContributorId && <button type="button" className="secondary-button" onClick={() => { setEditingContributorId(null); setContributorName(''); setContributorPhone(''); setPledgedAmount(''); setPaidAmount('0'); setContributorNotes(''); setContributionStatus('Uhariri umeghairiwa.') }} style={{ marginLeft: '8px' }}>Ghairi Uhariri</button>}
            </form>

            {contributionStatus && <p role="status">{contributionStatus}</p>}
          </div>

          <div className="card">
            <h2>Muhtasari wa Michango</h2>
            <p>
              <strong>Ahadi zote:</strong>{' '}
              TZS {contributors.reduce((sum, item) => sum + Number(item.pledged_amount || 0), 0).toLocaleString()}
            </p>
            <p>
              <strong>Malipo yaliyopokelewa:</strong>{' '}
              TZS {contributors.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0).toLocaleString()}
            </p>
            <p>
              <strong>Salio linalodaiwa:</strong>{' '}
              TZS {contributors.reduce((sum, item) => sum + Math.max(0, Number(item.pledged_amount || 0) - Number(item.paid_amount || 0)), 0).toLocaleString()}
            </p>
            <p><strong>Idadi ya wachangiaji:</strong> {contributors.length}</p>
          </div>

          <div className="card">
            <h2>Tuma SMS za Michango</h2>
            <p>Salio lako la SMS: {smsBalance} credits</p>

            <label>Chagua aina ya utumaji</label>
            <select
              value={contributionSmsMode}
              onChange={(e) => setContributionSmsMode(e.target.value)}
            >
              <option value="all">1. Wachangiaji wote</option>
              <option value="balance">2. Wenye salio pekee</option>
              <option value="personal">3. Ujumbe binafsi wenye ahadi, malipo na salio</option>
            </select>

            {contributionSmsMode !== 'personal' && (
              <>
                <label>Ujumbe wa SMS</label>
                <textarea
                  value={contributionSmsMessage}
                  onChange={(e) => setContributionSmsMessage(e.target.value)}
                  rows={4}
                  placeholder="Andika ujumbe wa SMS"
                />
                <p>
                  Unaweza kutumia {'{jina}'}, {'{ahadi}'}, {'{amelipa}'},
                  {'{salio}'} na {'{event}'} ndani ya ujumbe.
                </p>
              </>
            )}

            <button
              className="primary-button"
              disabled={contributionSmsSending || contributorsLoading}
              onClick={sendContributionSms}
            >
              {contributionSmsSending ? 'Inatuma...' : 'Tuma SMS za Michango'}
            </button>

            {contributionSmsStatus && <p>{contributionSmsStatus}</p>}
          </div>

          <div className="card">
            <h2>Orodha ya Wachangiaji</h2>
            {contributorsLoading ? (
              <p>Inapakia wachangiaji...</p>
            ) : contributors.length === 0 ? (
              <p>Bado hakuna mchangiaji aliyehifadhiwa kwenye event hii.</p>
            ) : (
              <div className="events-list">
                {contributors.map((item) => {
                  const balance = Math.max(
                    0,
                    Number(item.pledged_amount || 0) - Number(item.paid_amount || 0)
                  )

                  return (
                    <div className="card" key={item.id} style={{ background: '#fffdf7', color: '#252525', border: '1px solid #d6c18a', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                      <h3 style={{ color: '#5b4510', background: '#f5edda', padding: '8px 10px', borderRadius: '6px' }}>{item.full_name}</h3>
                      {item.phone && <p style={{ color: '#252525', background: '#fff', padding: '7px 10px', borderRadius: '5px', border: '1px solid #eee' }}><strong>Simu:</strong> {item.phone}</p>}
                      <p style={{ color: '#252525', background: '#fff', padding: '7px 10px', borderRadius: '5px', border: '1px solid #eee' }}><strong>Ahadi:</strong> TZS {Number(item.pledged_amount || 0).toLocaleString()}</p>
                      <p style={{ color: '#252525', background: '#fff', padding: '7px 10px', borderRadius: '5px', border: '1px solid #eee' }}><strong>Amelipa:</strong> TZS {Number(item.paid_amount || 0).toLocaleString()}</p>
                      <p style={{ color: '#252525', background: '#fff', padding: '7px 10px', borderRadius: '5px', border: '1px solid #eee' }}><strong>Salio:</strong> TZS {balance.toLocaleString()}</p>
                      {item.notes && <p style={{ color: '#252525', background: '#fff', padding: '7px 10px', borderRadius: '5px', border: '1px solid #eee' }}><strong>Maelezo:</strong> {item.notes}</p>}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {balance > 0 && <button className="primary-button" onClick={() => recordContributionPayment(item)}>Rekodi Malipo</button>}
                        <button type="button" className="secondary-button" onClick={() => editContributor(item)}>Hariri</button>
                        <button type="button" className="secondary-button" onClick={() => deleteContributor(item)}>Futa</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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
                  'Weka jina na namba moja kwa kila mstari\nMfano:\nJohn | 255712345678\nMary | 255713456789\nJuma | 255714567890'
                }
                value={smsRecipients}
                onChange={(e) =>
                  setSmsRecipients(e.target.value)
                }
                rows="7"
              />

              <div style={{ marginTop: '12px', marginBottom: '18px' }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>

                  {/* SMS CONTACTS UI */}
                  <div className="card" style={{ marginTop: '16px', marginBottom: '18px' }}>
                    <h3 style={{ marginTop: 0 }}>Contacts Zangu</h3>
                    <p style={{ fontSize: '13px' }}>
                      Hifadhi majina na namba za wateja ili uzitumie tena unapowatumia SMS.
                    </p>
                    <form onSubmit={saveSmsContact}>
                      <label>Jina la contact</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Mfano: John"
                        required
                      />
                      <label style={{ display: 'block', marginTop: '10px' }}>Namba ya simu</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Mfano: 255712345678"
                        required
                      />
                      <button type="submit" className="primary-button" disabled={contactsSaving} style={{ marginTop: '10px' }}>
                        {contactsSaving ? 'Inahifadhi...' : 'Hifadhi Contact'}
                      </button>
                    </form>

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong>Contacts zilizohifadhiwa ({smsContacts.length})</strong>
                        <button type="button" onClick={loadSmsContacts} disabled={contactsLoading}>
                          {contactsLoading ? 'Inapakia...' : 'Refresh'}
                        </button>
                      </div>

                      {contactsLoading && <p>Inapakia contacts...</p>}
                      {!contactsLoading && smsContacts.length === 0 && (
                        <p style={{ fontSize: '13px' }}>Bado hujahifadhi contact yoyote.</p>
                      )}

                      {smsContacts.map((contact) => (
                        <div key={contact.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee', padding: '8px 0' }}>
                          <input
                            type="checkbox"
                            checked={selectedContactIds.includes(String(contact.id))}
                            onChange={(e) => setSelectedContactIds((previous) =>
                              e.target.checked
                                ? [...previous, String(contact.id)]
                                : previous.filter((id) => id !== String(contact.id))
                            )}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600' }}>{contact.name || 'Bila jina'}</div>
                            <div style={{ fontSize: '13px' }}>{contact.phone}</div>
                          </div>
                          <button type="button" onClick={() => deleteSmsContact(contact.id)}>
                            Futa
                          </button>
                        </div>
                      ))}

                      <button type="button" className="primary-button" onClick={addSelectedContactsToRecipients} style={{ marginTop: '12px' }}>
                        Ongeza waliochaguliwa kwa wapokeaji
                      </button>
                    </div>

                    {contactsStatus && (
                      <p role="status" style={{ marginBottom: 0, marginTop: '10px' }}>{contactsStatus}</p>
                    )}
                  </div>

                  Chaguo la 2: Upload CSV
                </div>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setCsvFile(file)
                    handleCsvUpload(file)
                  }}
                />

                <p style={{ marginTop: '8px', fontSize: '13px' }}>
                  Format ya CSV: <strong>name,phone</strong>
                  <br />
                  Mfano: John,255712345678
                  <br />
                  Mary,255713456789
                </p>

                {csvFile && (
                  <p className="message">
                    CSV imechaguliwa: {csvFile.name}
                  </p>
                )}

                {csvFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setCsvFile(null)
                      setSmsRecipients('')
                      setSmsMessageStatus('')
                    }}
                    style={{ marginTop: '8px' }}
                  >
                    Clear CSV
                  </button>
                )}
              </div>

              <label>
                Message
              </label>

              <textarea
                placeholder="Mfano: Karibu kwenye harusi weekend hii..."
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

          {/* SCHEDULED SMS */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h2>Panga SMS kwa Tarehe na Muda</h2>

            <p>
              Chagua muda ambao ungependa SMS zako zitumwe.
              Hakikisha una SMS credits za kutosha wakati wa kutuma.
            </p>

            <p style={{ fontSize: '13px' }}>
              Kumbuka: Utumaji wa moja kwa moja utaanza baada ya
              huduma ya ratiba kuwashwa na kuthibitishwa.
            </p>

            <form onSubmit={scheduleSms}>
              <label>Recipients</label>

              <p style={{ fontSize: '13px' }}>
                Tumia orodha ileile ya majina na namba uliyojaza
                kwenye fomu ya SMS hapo juu.
              </p>

              <label>Tarehe na muda wa kutuma</label>

              <input
                type="datetime-local"
                value={scheduledAt}
                min={new Date(
                  Date.now() - new Date().getTimezoneOffset() * 60000
                ).toISOString().slice(0, 16)}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                style={{
                  display: 'block',
                  width: '100%',
                  marginBottom: '16px',
                  padding: '12px',
                  boxSizing: 'border-box'
                }}
              />

              <button
                type="submit"
                className="primary-button"
                disabled={schedulingSms}
              >
                {schedulingSms ? 'Inahifadhi...' : 'Hifadhi Ratiba'}
              </button>
            </form>

            {scheduledSmsStatus && (
              <p className="message" role="status">
                {scheduledSmsStatus}
              </p>
            )}

            <hr style={{ margin: '24px 0' }} />

            <h3>Ratiba Zangu</h3>

            <button
              type="button"
              onClick={loadSmsSchedules}
              disabled={loadingSchedules}
              style={{ marginBottom: '16px' }}
            >
              {loadingSchedules ? 'Inapakia...' : 'Onyesha Ratiba'}
            </button>

            {loadingSchedules && (
              <p>Inapakia ratiba zako...</p>
            )}

            {!loadingSchedules && smsSchedules.length === 0 && (
              <p>Bado hakuna ratiba zilizohifadhiwa.</p>
            )}

            {smsSchedules.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #d6c18a',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '12px'
                }}
              >
                <p>
                  <strong>Tarehe:</strong>{' '}
                  {new Date(item.scheduled_at).toLocaleString()}
                </p>

                <p>
                  <strong>Wapokeaji:</strong>{' '}
                  {item.total_recipients ?? item.recipients?.length ?? 0}
                </p>

                <p>
                  <strong>Ujumbe:</strong> {item.message}
                </p>

                <p>
                  <strong>Hali:</strong> {item.status}
                </p>

                {item.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => cancelSmsSchedule(item.id)}
                  >
                    Ghairi Ratiba
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

    </main>
  </div>
)

}

export default App