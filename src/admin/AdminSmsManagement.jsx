import { useCallback, useEffect, useState } from 'react'

const API = 'https://forteevents.onrender.com'

function deliveryLabel(row) {
  if (row.beem_status === 'DELIVERED' || row.status === 'delivered') return 'Delivered'
  if (row.beem_status === 'UNDELIVERED') return 'Undelivered'
  if (row.beem_status === 'PENDING') return 'Pending'
  if (row.status === 'resending') return 'Resend in progress'
  if (row.status === 'unknown') return 'Status unknown — verify first'
  if (row.status === 'failed') return 'Failed — report unavailable'
  if (row.status === 'sent') return row.beem_request_id ? 'Submitted to Beem' : 'Tracking unavailable'
  return row.status || 'Unknown'
}

export default function AdminSmsManagement({ session, onBack }) {
  const [summary, setSummary] = useState({ all: 0, delivered: 0, pending: 0, failed: 0, submitted: 0 })
  const [history, setHistory] = useState([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const limit = 50
  const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

  const loadSummary = useCallback(async () => {
    const response = await fetch(`${API}/api/admin/sms/summary`, { headers })
    const result = await response.json()
    if (!response.ok || !result.ok) throw new Error(result.error || 'Muhtasari haujapatikana.')
    setSummary(result.summary)
  }, [session?.access_token])

  const loadHistory = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const response = await fetch(`${API}/api/admin/sms/history?${params}`, { headers })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'SMS history haijapatikana.')
      setHistory(result.history || []); setTotal(result.total || 0)
    } catch (err) { setError(err.message || 'Hitilafu ya kupakia SMS.') }
    finally { setLoading(false) }
  }, [session?.access_token, status, search, offset])

  const refresh = async () => {
    try { await Promise.all([loadSummary(), loadHistory()]) }
    catch (err) { setError(err.message || 'Imeshindikana kusasisha taarifa.') }
  }

  useEffect(() => { refresh() }, [loadSummary, loadHistory])

  const checkReports = async () => {
    setChecking(true); setNotice(''); setError('')
    try {
      const response = await fetch(`${API}/api/admin/sms/delivery-reports/check-all`, {
        method: 'POST', headers, body: JSON.stringify({ limit: 25 })
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'Ukaguzi umeshindikana.')
      const s = result.summary || {}
      setNotice(`Ukaguzi: ${s.checked || 0} umeangaliwa, ${s.delivered || 0} Delivered, ${s.pending || 0} Pending, ${s.undelivered || 0} Undelivered, ${s.errors || 0} hitilafu. Hakuna SMS iliyotumwa tena wala credits zilizokatwa.`)
      await refresh()
    } catch (err) { setError(err.message || 'Ukaguzi umeshindikana.') }
    finally { setChecking(false) }
  }

  const resend = async row => {
    const who = row.customer?.full_name || row.customer?.email || row.user_id
    const accepted = window.confirm(`Thibitisha resend ya SMS hii kwa ${row.recipient}?\n\nMteja: ${who}\nUjumbe: ${row.message}\n\nBeem imethibitisha UNDELIVERED. Gharama itabebwa na ForteEvents; salio la mteja halitakatwa.`)
    if (!accepted) return
    setBusyId(row.id); setNotice(''); setError('')
    try {
      const response = await fetch(`${API}/api/admin/sms/${row.id}/resend`, { method: 'POST', headers, body: JSON.stringify({}) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'Resend haikuthibitishwa.')
      setNotice(result.message || 'Resend imepokelewa.')
      await refresh()
    } catch (err) { setError(err.message || 'Resend haikufanikiwa.') }
    finally { setBusyId('') }
  }

  const cards = [
    ['SMS zote', summary.all], ['Delivered', summary.delivered], ['Pending', summary.pending],
    ['Failed', summary.failed], ['Submitted / bila ripoti', summary.submitted]
  ]

  return <div>
    <div className="page-header">
      <div><h1>SMS Management</h1><p>Ufuatiliaji na usimamizi wa SMS zote za wateja wa ForteEvents.</p></div>
      <button className="secondary-button" onClick={onBack}>Dashboard</button>
    </div>
    <div className="dashboard-grid">
      {cards.map(([label, value]) => <div className="card" key={label}><h3>{label}</h3><p className="big-number">{Number(value || 0).toLocaleString()}</p></div>)}
    </div>
    <div className="card" style={{ marginTop: 16 }}>
      <h2>Ufuatiliaji wa delivery</h2>
      <p>Ukaguzi unachukua hadi SMS 25 kwa mara moja, zenye Beem Request ID na zilizopita angalau dakika 5. Pending hazitumwi tena.</p>
      <button className="primary-button" onClick={checkReports} disabled={checking}>{checking ? 'Inakagua Beem...' : 'Kagua delivery reports (hadi 25)'}</button>
      <button className="secondary-button" style={{ marginLeft: 8 }} onClick={refresh} disabled={loading}>Refresh</button>
    </div>
    {notice && <div className="card"><p style={{ color: '#287a42' }}>{notice}</p></div>}
    {error && <div className="card"><p style={{ color: '#b00020' }}>{error}</p></div>}
    <div className="card" style={{ marginTop: 16 }}>
      <h2>SMS za wateja wote</h2>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <input aria-label="Tafuta SMS" placeholder="Tafuta namba au ujumbe..." value={search} onChange={e => { setOffset(0); setSearch(e.target.value) }} style={{ flex: '1 1 220px', minWidth: 180 }} />
        <select aria-label="Chuja hali" value={status} onChange={e => { setOffset(0); setStatus(e.target.value) }} style={{ minWidth: 180 }}>
          <option value="">Hali zote</option><option value="delivered">Delivered</option><option value="pending">Pending</option><option value="failed">Failed / Undelivered</option><option value="submitted">Submitted</option>
        </select>
      </div>
      {loading ? <p>Inapakia SMS...</p> : history.length === 0 ? <p>Hakuna SMS zilizopatikana kwa kichujio hiki.</p> :
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead><tr><th>Tarehe</th><th>Mteja</th><th>Mpokeaji</th><th>Ujumbe</th><th>SMS</th><th>Hali</th><th>Kitendo</th></tr></thead>
            <tbody>{history.map(row => {
              const canResend = row.status === 'failed' && row.beem_status === 'UNDELIVERED'
              return <tr key={row.id}>
                <td>{row.sent_at ? new Date(row.sent_at).toLocaleString() : '-'}{row.resend_of_id && <div style={{ fontSize: 11, color: '#8a6d1d' }}>Resend na Admin: {row.resend_admin?.full_name || 'Admin'}</div>}</td>
                <td>{row.customer?.full_name || row.customer?.email || 'Customer'}</td>
                <td>{row.recipient}</td>
                <td style={{ maxWidth: 260, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{row.message}</td>
                <td>{row.sms_count}</td>
                <td>{deliveryLabel(row)}{row.beem_status_checked_at && <div style={{ fontSize: 11, color: '#777' }}>Ukaguzi: {new Date(row.beem_status_checked_at).toLocaleString()}</div>}</td>
                <td>{canResend ? <button className="primary-button" disabled={busyId === row.id} onClick={() => resend(row)}>{busyId === row.id ? 'Inatuma...' : 'Resend (bure)'}</button> : row.resend_of_id ? 'Jaribio la resend' : row.beem_status === 'PENDING' ? 'Subiri / kagua tena' : '—'}</td>
              </tr>
            })}</tbody>
          </table>
        </div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        <span>Inaonyesha {history.length ? offset + 1 : 0}–{offset + history.length} kati ya {total}</span>
        <div><button className="secondary-button" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - limit))}>Zilizotangulia</button>{' '}<button className="secondary-button" disabled={offset + limit >= total || loading} onClick={() => setOffset(offset + limit)}>Zinazofuata</button></div>
      </div>
    </div>
  </div>
}
