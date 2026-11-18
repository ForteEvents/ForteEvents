import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'

const API = 'https://forteevents.onrender.com'

function statusLabel(value) {
  return ({ pending: 'Haijatumwa', sending: 'Inatumwa', sent: 'Imetumwa', delivered: 'Imefika', read: 'Imesomwa', failed: 'Imeshindwa' })[value] || value || 'Haijulikani'
}

export default function AdminECardDistribution({ session, onBack }) {
  const [cards, setCards] = useState([])
  const [cardId, setCardId] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [smsMessage, setSmsMessage] = useState('Unakaribishwa kwenye tukio letu. Tunafurahi kushiriki nawe siku hii maalumu.')
  const [templateName, setTemplateName] = useState('')
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = useMemo(() => cards.find(card => card.card_id === cardId) || null, [cards, cardId])

  const load = async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.rpc('admin_get_e_cards')
    if (loadError) setError('Imeshindikana kupakia kadi: ' + loadError.message)
    else {
      const rows = data || []
      setCards(rows)
      setCardId(current => rows.some(row => row.card_id === current) ? current : rows.find(row => row.is_published)?.card_id || rows[0]?.card_id || '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const request = async (path, body) => {
    const token = session?.access_token
    if (!token) throw new Error('Session ya Admin haijapatikana. Toka kisha ingia tena.')
    const response = await fetch(API + path, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.ok) throw new Error(data.error || 'Ombi la usambazaji halikufanikiwa.')
    return data
  }

  const prepare = async () => {
    if (!selected) return
    setBusy(true); setError(''); setNotice(''); setResult(null); setPreview(null)
    try {
      const data = await request('/api/admin/ecard/' + encodeURIComponent(cardId) + '/distribution-preview', { channel, smsMessage })
      setPreview(data)
      setNotice('Muhtasari wa usambazaji umeandaliwa. Kagua idadi na gharama kabla ya kutuma.')
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const distribute = async () => {
    if (!selected || !preview) return
    if (channel === 'whatsapp' || channel === 'both') {
      if (!templateName.trim()) { setError('Weka jina la WhatsApp template iliyoidhinishwa na Meta.'); return }
    }
    if ((channel === 'sms' || channel === 'both') && !smsMessage.trim()) { setError('Andika ujumbe wa SMS.'); return }
    const count = channel === 'sms' ? preview.eligibleSms : channel === 'whatsapp' ? preview.eligibleWhatsApp : Math.max(preview.eligibleSms, preview.eligibleWhatsApp)
    if (!window.confirm('Unathibitisha kuanza kutuma kadi kwa wageni ' + count + '? Ujumbe utatumwa kwa wageni ambao bado hawajatumwa kwenye njia uliyochagua.')) return
    setBusy(true); setError(''); setNotice('')
    try {
      const data = await request('/api/admin/ecard/' + encodeURIComponent(cardId) + '/distribute', {
        channel,
        origin: 'https://forteevents-web.onrender.com',
        smsMessage,
        templateName: templateName.trim(),
        language: 'sw'
      })
      setResult(data)
      setNotice('Ombi la usambazaji limekamilika. Kagua matokeo kwa kila mgeni hapa chini.')
      await load()
      setPreview(null)
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  if (loading) return <div className="card"><p>Inapakia kadi za wateja...</p></div>

  return <>
    <div className="page-header">
      <div><h1>Usambazaji wa E-card</h1><p>Chagua kadi iliyochapishwa, kagua wageni na usambaze mialiko.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" className="secondary-button" onClick={load}>Refresh</button>
        <button type="button" className="secondary-button" onClick={onBack}>Rudi Dashboard</button>
      </div>
    </div>

    {error && <div className="card ecard-studio-error" role="alert">{error}</div>}
    {notice && <div className="card ecard-studio-notice" role="status">{notice}</div>}

    <div className="card">
      <h2>1. Chagua kadi ya kusambaza</h2>
      <label>Kadi iliyochapishwa</label>
      <select value={cardId} onChange={e=>{setCardId(e.target.value);setPreview(null);setResult(null)}} style={{width:'100%'}}>
        <option value="">Chagua kadi</option>
        {cards.filter(card=>card.is_published).map(card=><option key={card.card_id} value={card.card_id}>{card.title || card.occasion || 'Kadi'} — {card.customer_name || 'Mteja'} ({(card.guests||[]).length} wageni)</option>)}
      </select>
      {!cards.some(card=>card.is_published) && <p>Bado hakuna kadi iliyochapishwa. Kadi itajitokeza hapa baada ya Admin kuitengeneza na kuichapisha.</p>}
      {selected && <>
        <p><strong>{selected.title || selected.occasion || 'Kadi ya mwaliko'}</strong> · {selected.customer_name} · {selected.event_date || 'Tarehe haijawekwa'}</p>
        <p>Wageni: {(selected.guests||[]).length} · Hali: {selected.is_published ? 'Imechapishwa' : 'Rasimu'}</p>
      </>}
    </div>

    {selected && <>
      <div className="card">
        <h2>2. Chagua njia ya usambazaji</h2>
        <label>Njia</label>
        <select value={channel} onChange={e=>{setChannel(e.target.value);setPreview(null);setResult(null)}} style={{width:'100%'}}>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="both">WhatsApp na SMS</option>
        </select>
        {(channel === 'sms' || channel === 'both') && <>
          <label>Ujumbe wa SMS</label>
          <textarea rows="3" value={smsMessage} onChange={e=>{setSmsMessage(e.target.value);setPreview(null)}} style={{width:'100%'}}/>
          <p className="ecard-form-hint">Mfumo utaongeza jina la mgeni na link yake binafsi ya kadi. SMS credits zitakatwa kwenye salio la E-card la mteja.</p>
        </>}
        {(channel === 'whatsapp' || channel === 'both') && <>
          <label>Jina la WhatsApp template iliyoidhinishwa na Meta</label>
          <input value={templateName} onChange={e=>setTemplateName(e.target.value)} placeholder="Mfano: ecard_invitation_sw" style={{width:'100%'}}/>
          <p className="ecard-form-hint">WhatsApp Cloud API inahitaji template iliyoidhinishwa na Meta. Mfumo huu hutuma jina la mgeni na link yake binafsi ya kadi.</p>
        </>}
        <button type="button" className="primary-button" disabled={busy || !selected.is_published} onClick={prepare}>{busy ? 'Inaandaa...' : 'Kagua usambazaji kwanza'}</button>
      </div>

      {preview && <div className="card">
        <h2>3. Muhtasari kabla ya kutuma</h2>
        <div className="dashboard-grid">
          <div><strong>Wageni wote</strong><p className="big-number">{preview.totalGuests}</p></div>
          {(channel === 'sms' || channel === 'both') && <div><strong>SMS zitakazotumwa</strong><p className="big-number">{preview.eligibleSms}</p></div>}
          {(channel === 'whatsapp' || channel === 'both') && <div><strong>WhatsApp zitakazotumwa</strong><p className="big-number">{preview.eligibleWhatsApp}</p></div>}
          {(channel === 'sms' || channel === 'both') && <div><strong>SMS credits zinazohitajika</strong><p className="big-number">{preview.smsCreditsRequired}</p><small>Salio: {preview.smsBalance} · {preview.smsBalanceSufficient ? 'Linatosha' : 'Haitoshi'}</small></div>}
          <div><strong>Tayari zimetumwa kwa SMS</strong><p className="big-number">{preview.alreadySentSms}</p></div>
          <div><strong>Tayari zimetumwa WhatsApp</strong><p className="big-number">{preview.alreadySentWhatsApp}</p></div>
        </div>
        {(channel === 'sms' || channel === 'both') && !preview.smsBalanceSufficient && <p style={{color:'#a12b20'}}>Salio la SMS la mteja halitoshi. Ongeza credits kabla ya kutuma SMS.</p>}
        <button type="button" className="primary-button" disabled={busy || ((channel === 'sms' || channel === 'both') && !preview.smsBalanceSufficient) || ((channel === 'whatsapp' || channel === 'both') && !templateName.trim())} onClick={distribute}>{busy ? 'Inatuma...' : 'Thibitisha na sambaza sasa'}</button>
      </div>}

      <div className="card">
        <h2>Hali za wageni</h2>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',minWidth:600,borderCollapse:'collapse'}}>
            <thead><tr><th>Mgeni</th><th>Namba</th><th>WhatsApp</th><th>SMS</th></tr></thead>
            <tbody>{(selected.guests||[]).map(guest=><tr key={guest.id}>
              <td>{guest.guest_name}</td><td>{guest.whatsapp_phone || '—'}</td>
              <td>{statusLabel(guest.whatsapp_delivery_status)}</td><td>{statusLabel(guest.sms_delivery_status)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </>}

    {result && <div className="card">
      <h2>Matokeo ya usambazaji</h2>
      <p>Wageni waliojaribiwa: {result.attemptedGuests} · WhatsApp zilizokubaliwa: {result.whatsappAccepted} · SMS zilizokubaliwa: {result.smsAccepted}</p>
      {(result.results||[]).map((item,index)=><div key={item.guestId||index} style={{padding:'8px 0',borderTop:'1px solid #eee'}}>
        <strong>{item.guestName}</strong>
        <div>WhatsApp: {item.whatsapp ? (item.whatsapp.ok ? 'Imekubaliwa na Meta' : item.whatsapp.error) : 'Haikuchaguliwa'}</div>
        <div>SMS: {item.sms ? (item.sms.ok ? 'Imekubaliwa na Beem' : item.sms.error) : 'Haikuchaguliwa'}</div>
      </div>)}
      <p className="ecard-form-hint">Hali ya “Imekubaliwa” inamaanisha mtoa huduma amepokea ujumbe; si uthibitisho kwamba mgeni ameusoma.</p>
    </div>}
  </>
}
