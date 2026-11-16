import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
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

function GuestQr({ value, name }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 3, width: 240 })
      .then(url => { if (active) setSrc(url) })
      .catch(() => { if (active) setSrc('') })
    return () => { active = false }
  }, [value])
  return src ? <img src={src} alt={'QR ya mwaliko wa ' + name} style={{width:'128px',height:'128px',objectFit:'contain'}} /> : <span>Inaandaa QR...</span>
}

export default function AdminECardRequests({ onBack }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [templateIds, setTemplateIds] = useState([])
  const [selectedTemplates, setSelectedTemplates] = useState({})
  const [guestQrs, setGuestQrs] = useState({})
  const [guestPages, setGuestPages] = useState({})
  const [notice, setNotice] = useState('')
  const [distributionChannel, setDistributionChannel] = useState('both')
  const [distributionSmsText, setDistributionSmsText] = useState('Habari, huu hapa mwaliko wako. Tunakukaribisha kushiriki nasi siku hii ya pekee:')
  const [whatsappTemplate, setWhatsappTemplate] = useState('')
  const [whatsappLanguage, setWhatsappLanguage] = useState('sw')
  const [distributionPreview, setDistributionPreview] = useState({})
  const [distributionBusy, setDistributionBusy] = useState('')

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
      for (const request of data || []) {
        if (!ids.includes(next[request.id])) next[request.id] = ids[0] || ''
      }
      return next
    })

    const fulfilled = (data || []).filter(request => request.generated_card_id)
    const qrResults = await Promise.all(fulfilled.map(async request => {
      const { data: guests, error: qrError } = await supabase.rpc('admin_get_e_card_guest_qr', {
        p_card_id: request.generated_card_id,
        p_limit: 50,
        p_offset: 0
      })
      return [request.id, qrError ? [] : (guests || [])]
    }))
    setGuestQrs(Object.fromEntries(qrResults))
    setGuestPages(Object.fromEntries(fulfilled.map(request => [request.id, 0])))
    setLoading(false)
  }

  const loadGuestPage = async (request, page) => {
    const safePage = Math.max(0, page)
    const { data, error: qrError } = await supabase.rpc('admin_get_e_card_guest_qr', {
      p_card_id: request.generated_card_id,
      p_limit: 50,
      p_offset: safePage * 50
    })
    if (qrError) setError(qrError.message)
    else {
      setGuestQrs(current => ({ ...current, [request.id]: data || [] }))
      setGuestPages(current => ({ ...current, [request.id]: safePage }))
    }
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
      setNotice('Kadi imetengenezwa. Wageni: ' + (result?.guest_count ?? 0) + '. QR za wageni zimetengenezwa.')
      await load()
    }
    setBusyId('')
  }

  const previewDistribution = async request => {
    setError('')
    setNotice('')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) { setError('Session imeisha. Ingia tena.'); return }
    try {
      const response = await fetch('https://forteevents.onrender.com/api/admin/ecard/' + encodeURIComponent(request.generated_card_id) + '/distribution-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ channel: distributionChannel, smsMessage: distributionSmsText, origin: window.location.origin })
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'Imeshindikana kuhesabu usambazaji.')
      setDistributionPreview(current => ({ ...current, [request.id]: result }))
    } catch (previewError) { setError(previewError.message) }
  }

  const sendDistribution = async request => {
    setError('')
    setNotice('')
    if ((distributionChannel === 'whatsapp' || distributionChannel === 'both') && !whatsappTemplate.trim()) { setError('Weka jina la WhatsApp template iliyoidhinishwa na Meta.'); return }
    if ((distributionChannel === 'sms' || distributionChannel === 'both') && !distributionSmsText.trim()) { setError('Andika ujumbe wa SMS.'); return }
    const preview = distributionPreview[request.id]
    if (!preview) { setError('Bonyeza Kagua idadi na gharama kwanza.'); return }
    if ((distributionChannel === 'sms' || distributionChannel === 'both') && !preview.smsBalanceSufficient) {
      setError('Salio la SMS la mteja halitoshi. Linahitajika credits ' + preview.smsCreditsRequired + ', salio ni ' + preview.smsBalance + '.')
      return
    }
    setDistributionBusy(request.id)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token
    if (!token) { setDistributionBusy(''); setError('Session imeisha. Ingia tena.'); return }
    try {
      const response = await fetch('https://forteevents.onrender.com/api/admin/ecard/' + encodeURIComponent(request.generated_card_id) + '/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          channel: distributionChannel, smsMessage: distributionSmsText,
          templateName: whatsappTemplate.trim(), language: whatsappLanguage,
          origin: window.location.origin
        })
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'Usambazaji haujakamilika.')
      setNotice('Usambazaji umechakatwa. SMS zilizokubaliwa: ' + result.smsAccepted + '; WhatsApp zilizokubaliwa: ' + result.whatsappAccepted + '. Angalia hali za wageni hapa chini.')
      setDistributionPreview(current => { const next = { ...current }; delete next[request.id]; return next })
      await load()
    } catch (sendError) { setError(sendError.message) }
    setDistributionBusy('')
  }

  return (
    <section>
      <div className="page-header">
        <div><h1>Maombi ya E-card</h1><p>ForteEvents inapokea taarifa za tukio; timu yetu inachagua kiolezo, kutengeneza kadi na QR za wageni.</p></div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button type="button" className="secondary-button" onClick={load}>Refresh</button>
          <button type="button" className="secondary-button" onClick={onBack}>Rudi</button>
        </div>
      </div>
      {loading ? <p>Inapakia maombi...</p> : requests.length === 0 ? <div className="card"><p>Hakuna ombi la E-card lililopokelewa bado.</p></div> : requests.map(request => {
        const details = request.event_details || {}
        const guests = Array.isArray(request.guest_list) ? request.guest_list : []
        const templateOptions = templateIds.map(id => ECARD_TEMPLATES.find(item => item.id === id)).filter(Boolean)
        const generatedGuests = guestQrs[request.id] || []
        const guestPage = guestPages[request.id] || 0
        const guestPageCount = Math.max(1, Math.ceil(guests.length / 50))
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
              <div>
                <p><strong>Kadi imetengenezwa.</strong> Wageni {guests.length}; gharama ya mialiko TSh {(guests.length * 500).toLocaleString('en-US')}.</p>
                <div style={{border:'1px solid #e5dfd2',borderRadius:'10px',padding:'14px',margin:'14px 0'}}>
                  <h3>Usambazaji wa mialiko</h3>
                  <label>Chagua njia ya kutuma</label>
                  <select value={distributionChannel} onChange={event=>{setDistributionChannel(event.target.value);setDistributionPreview({})}}>
                    <option value="whatsapp">WhatsApp pekee</option>
                    <option value="sms">SMS pekee</option>
                    <option value="both">WhatsApp + SMS zote mbili</option>
                  </select>
                  {(distributionChannel === 'sms' || distributionChannel === 'both') && <>
                    <label>Ujumbe wa SMS (link ya kila mgeni itaongezwa moja kwa moja)</label>
                    <textarea rows="3" value={distributionSmsText} onChange={event=>{setDistributionSmsText(event.target.value);setDistributionPreview({})}} />
                  </>}
                  {(distributionChannel === 'whatsapp' || distributionChannel === 'both') && <>
                    <label>Jina la WhatsApp template iliyoidhinishwa na Meta</label>
                    <input value={whatsappTemplate} onChange={event=>setWhatsappTemplate(event.target.value)} placeholder="Mfano: ecard_invitation" />
                    <label>Lugha ya template</label>
                    <select value={whatsappLanguage} onChange={event=>setWhatsappLanguage(event.target.value)}>
                      <option value="sw">Swahili (sw)</option><option value="en">English (en)</option><option value="en_US">English US (en_US)</option>
                    </select>
                    <p className="ecard-form-hint">Template lazima iwe imeidhinishwa na Meta na iwe na sehemu mbili za body: jina la mgeni na link ya mwaliko, kwa mpangilio huo.</p>
                  </>}
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
                    <button type="button" className="secondary-button" onClick={()=>previewDistribution(request)} disabled={distributionBusy===request.id}>Kagua idadi na gharama</button>
                    <button type="button" className="primary-button" onClick={()=>sendDistribution(request)} disabled={distributionBusy===request.id || !distributionPreview[request.id]}>
                      {distributionBusy===request.id ? 'Inatuma...' : 'Tuma mialiko'}
                    </button>
                  </div>
                  {distributionPreview[request.id] && <div className="ecard-form-hint" style={{marginTop:'10px'}}>
                    <strong>Muhtasari wa kutuma:</strong>
                    <p>Wageni wote: {distributionPreview[request.id].totalGuests}; SMS zitakazojaribiwa: {distributionPreview[request.id].eligibleSms}; WhatsApp zitakazojaribiwa: {distributionPreview[request.id].eligibleWhatsApp}.</p>
                    <p>SMS credits zinazohitajika: {distributionPreview[request.id].smsCreditsRequired}; salio la mteja: {distributionPreview[request.id].smsBalance}. Gharama ya WhatsApp itategemea bei ya Meta.</p>
                    <p>Tayari zimetumwa: SMS {distributionPreview[request.id].alreadySentSms}; WhatsApp {distributionPreview[request.id].alreadySentWhatsApp}. Ujumbe uliofanikiwa hautatumwa tena.</p>
                  </div>}
                </div>
                <h3>QR za wageni</h3>
                <p>Wageni {guests.length ? guestPage * 50 + 1 : 0}–{Math.min((guestPage + 1) * 50, guests.length)} kati ya {guests.length}. Inaonyesha ukurasa {guestPage + 1} wa {guestPageCount}.</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:'12px'}}>
                  {generatedGuests.map(guest => {
                    const url = window.location.origin + '/?card=' + encodeURIComponent(guest.card_slug) + '&guest=' + encodeURIComponent(guest.token)
                    const shareText = 'Habari ' + guest.guest_name + ', huu hapa mwaliko wako: ' + url
                    return (
                      <div key={guest.token} style={{border:'1px solid #e5dfd2',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
                        <strong>{guest.guest_name}</strong>
                        <p>{guest.invite_type === 'double' ? 'Mwaliko wa watu 2' : 'Mwaliko wa mtu 1'}</p>
                        <p style={{fontSize:'13px',color:'#665b48'}}>Simu: {guest.whatsapp_phone || 'Namba haijawekwa'}<br />SMS: {guest.sms_delivery_status || 'pending'} · WhatsApp: {guest.whatsapp_delivery_status || 'pending'}</p>
                        {(guest.sms_delivery_error || guest.whatsapp_delivery_error) && <p style={{fontSize:'12px',color:'#9b3c32',overflowWrap:'anywhere'}}>SMS: {guest.sms_delivery_error || '-'}<br />WhatsApp: {guest.whatsapp_delivery_error || '-'}</p>}
                        <GuestQr value={url} name={guest.guest_name} />
                        <p><a href={url} target="_blank" rel="noreferrer">Fungua mwaliko</a></p>
                        <p><a href={'https://wa.me/' + (guest.whatsapp_phone || '') + '?text=' + encodeURIComponent(shareText)} target="_blank" rel="noreferrer">Fungua WhatsApp kwa mkono</a></p>
                      </div>
                    )
                  })}
                </div>
                {generatedGuests.length === 0 && <p>QR hazijaweza kupakiwa. Bonyeza Refresh kujaribu tena.</p>}
                {guestPageCount > 1 && <div style={{display:'flex',gap:'8px',alignItems:'center',justifyContent:'center',marginTop:'12px'}}>
                  <button type="button" className="secondary-button" disabled={guestPage===0} onClick={()=>loadGuestPage(request,guestPage-1)}>Wageni waliotangulia</button>
                  <button type="button" className="secondary-button" disabled={guestPage+1>=guestPageCount} onClick={()=>loadGuestPage(request,guestPage+1)}>Wageni wanaofuata</button>
                </div>}
              </div>
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
