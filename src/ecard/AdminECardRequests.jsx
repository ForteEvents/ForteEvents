import { useEffect, useState } from 'react'

const STATUS_LABELS = {
  submitted: 'Limepokelewa',
  reviewing: 'Linakaguliwa',
  designing: 'Linatengenezwa',
  ready: 'Kadi iko tayari',
  dispatched: 'Mialiko imesambazwa',
  completed: 'Imekamilika',
  rejected: 'Limekataliwa'
}

export default function AdminECardRequests({ onBack }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    const { data, error: loadError } = await (await import('../supabaseClient')).supabase
      .from('e_card_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (loadError) setError(loadError.message)
    else setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (request, status) => {
    setBusyId(request.id)
    setError('')
    const { error: updateError } = await (await import('../supabaseClient')).supabase
      .from('e_card_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request.id)
    if (updateError) setError(updateError.message)
    else setRequests(items => items.map(item => item.id === request.id ? { ...item, status } : item))
    setBusyId('')
  }

  return (
    <section>
      <div className="page-header">
        <div><h1>Maombi ya E-card</h1><p>ForteEvents inapokea taarifa za tukio na wageni; timu yetu inatengeneza na kusambaza kadi.</p></div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button type="button" className="secondary-button" onClick={load}>Refresh</button>
          <button type="button" className="secondary-button" onClick={onBack}>Rudi</button>
        </div>
      </div>
      {loading ? <p>Inapakia maombi...</p> : requests.length === 0 ? <div className="card"><p>Hakuna ombi la E-card lililopokelewa bado.</p></div> : requests.map(request => {
        const details = request.event_details || {}
        const guests = Array.isArray(request.guest_list) ? request.guest_list : []
        return (
          <article className="card" key={request.id} style={{marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
              <div>
                <h2>{details.title || 'Tukio bila jina'}</h2>
                <p><strong>Mteja:</strong> {request.customer_name} · {request.customer_phone}</p>
                <p><strong>Tukio:</strong> {details.occasion || '-'} · {details.event_date || '-'} · {details.event_time || '-'}</p>
                <p><strong>Familia:</strong> {details.host_names || '-'} | <strong>Ukumbi:</strong> {details.venue || '-'}</p>
              </div>
              <div>
                <strong>Hali: {STATUS_LABELS[request.status] || request.status}</strong>
                <p><small>{new Date(request.created_at).toLocaleString('sw-TZ')}</small></p>
              </div>
            </div>
            <details>
              <summary>Angalia taarifa zote na wageni ({guests.length})</summary>
              <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({event_details:details,guest_list:guests},null,2)}</pre>
            </details>
            <label>Badilisha hatua ya ombi</label>
            <select value={request.status} disabled={busyId===request.id} onChange={event=>updateStatus(request,event.target.value)}>
              {Object.entries(STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </article>
        )
      })}
      {error && <p className="message" role="alert">{error}</p>}
    </section>
  )
}
