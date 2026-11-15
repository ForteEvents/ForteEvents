import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { ECARD_TEMPLATES } from './templateRegistry.js'

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
  const [templateIds, setTemplateIds] = useState([])
  const [selectedTemplates, setSelectedTemplates] = useState({})
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const [{ data, error: loadError }, { data: published, error: templateError }] = await Promise.all([
      supabase.from('e_card_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('e_card_template_settings').select('template_id').eq('is_published', true)
    ])
    if (loadError) setError(loadError.message)
    else setRequests(data || [])
    if (templateError) setError(current => current || templateError.message)
    const ids = (published || []).map(row => row.template_id).filter(id => ECARD_TEMPLATES.some(item => item.id === id))
    setTemplateIds(ids)
    setSelectedTemplates(current => {
      const next = { ...current }
      for (const id of ids) if (!next[id]) next[id] = ids[0] || ''
      return next
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const updateStatus = async (request, status) => {
    setBusyId(request.id)
    setError('')
    const { error: updateError } = await supabase
      .from('e_card_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', request.id)
    if (updateError) setError(updateError.message)
    else setRequests(items => items.map(item => item.id === request.id ? { ...item, status } : item))
    setBusyId('')
  }

  const fulfilRequest = async request => {
    const templateId = selectedTemplates[request.id] || templateIds[0]
    const template = ECARD_TEMPLATES.find(item => item.id === templateId)
    if (!template) {
      setError('Hakuna kiolezo kilichochapishwa. Chapisha kiolezo kwanza kwenye usimamizi wa templates.')
      return
    }
    setBusyId(request.id)
    setError('')
    setNotice('')
    const { data, error: fulfilError } = await supabase.rpc('admin_fulfill_e_card_request', {
      p_request_id: request.id,
      p_template_id: template.id,
      p_template_snapshot: template
    })
    if (fulfilError) {
      setError('Kadi haikutengenezwa: ' + fulfilError.message)
    } else {
      const result = Array.isArray(data) ? data[0] : data
      setNotice('Kadi imetengenezwa. Wageni: ' + (result?.guest_count ?? 0) + '. Kiungo cha kadi: ?card=' + (result?.card_slug || ''))
      await load()
    }
    setBusyId('')
  }

  return (
    <section>
      <div className="page-header">
        <div><h1>Maombi ya E-card</h1><p>ForteEvents inapokea taarifa za tukio na wageni; timu yetu inachagua kiolezo, kutengeneza kadi na QR za wageni.</p></div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button type="button" className="secondary-button" onClick={load}>Refresh</button>
          <button type="button" className="secondary-button" onClick={onBack}>Rudi</button>
        </div>
      </div>
      {loading ? <p>Inapakia maombi...</p> : requests.length === 0 ? <div className="card"><p>Hakuna ombi la E-card lililopokelewa bado.</p></div> : requests.map(request => {
        const details = request.event_details || {}
        const guests = Array.isArray(request.guest_list) ? request.guest_list : []
        const templateOptions = templateIds.map(id => ECARD_TEMPLATES.find(item => item.id === id)).filter(Boolean)
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
            {request.generated_card_id ? (
              <p><strong>Kadi imetengenezwa.</strong> Wageni {guests.length}; gharama ya mialiko TSh {(guests.length * 500).toLocaleString('en-US')}.</p>
            ) : (
              <div>
                <label>Kiolezo rasmi cha ForteEvents</label>
                <select value={selectedTemplates[request.id] || templateIds[0] || ''} onChange={event=>setSelectedTemplates(current=>({...current,[request.id]:event.target.value}))} disabled={busyId===request.id || templateOptions.length===0}>
                  {templateOptions.map(template=><option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
                <p className="ecard-form-hint">Gharama ya kutengeneza QR na mialiko: TSh {(guests.length * 500).toLocaleString('en-US')} kwa wageni {guests.length}. Mfumo utakata salio la E-card la mteja kwa TSh 500 kwa kila mwaliko.</p>
                <button type="button" className="primary-button" onClick={()=>fulfilRequest(request)} disabled={busyId===request.id || templateOptions.length===0}>
                  {busyId===request.id ? 'Inatengeneza kadi...' : 'Tengeneza kadi na QR za wageni'}
                </button>
              </div>
            )}
            <label>Badilisha hatua ya ombi</label>
            <select value={request.status} disabled={busyId===request.id} onChange={event=>updateStatus(request,event.target.value)}>
              {Object.entries(STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </article>
        )
      })}
      {notice && <p className="message" role="status">{notice}</p>}
      {error && <p className="message" role="alert">{error}</p>}
    </section>
  )
}
