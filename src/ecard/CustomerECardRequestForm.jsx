import { useEffect, useMemo, useState } from 'react'

const OCCASIONS = ['Harusi','Send-off','Kipaimara','Graduation','Birthday','Kitchen Party','Shukrani','Kupongeza','Kumuaga','Tukio lingine']
const STATUS_LABELS = {
  submitted: 'Limepokelewa',
  reviewing: 'Linakaguliwa',
  designing: 'Linatengenezwa',
  ready: 'Kadi iko tayari',
  dispatched: 'Mialiko imesambazwa',
  completed: 'Imekamilika',
  rejected: 'Limekataliwa'
}

const EMPTY = {
  customer_name: '',
  customer_phone: '',
  occasion: 'Harusi',
  title: '',
  host_names: '',
  bride_name: '',
  groom_name: '',
  event_date: '',
  event_time: '',
  ceremony_time: '',
  ceremony_venue: '',
  reception_time: '',
  reception_venue: '',
  venue: '',
  location_url: '',
  image_url: '',
  food_note: '',
  dress_code: '',
  rsvp_deadline: '',
  rsvp_contact_name: '',
  rsvp_contact_phone: '',
  rsvp_contact_name_2: '',
  rsvp_contact_phone_2: '',
  message: '',
  guest_list_text: ''
}

function normalizeWhatsAppPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (/^0[67]\d{8}$/.test(digits)) return '255' + digits.slice(1)
  if (/^[67]\d{8}$/.test(digits)) return '255' + digits
  if (/^255[67]\d{8}$/.test(digits)) return digits
  if (/^[1-9]\d{9,14}$/.test(digits)) return digits
  return ''
}

function parseGuestList(value) {
  return value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [name, phone, type = 'single'] = line.split(/[\t,]/).map(part => part.trim())
    return {
      guest_name: name,
      whatsapp_phone: normalizeWhatsAppPhone(phone),
      invite_type: type.toLowerCase()
    }
  })
}

export default function CustomerECardRequestForm({ supabase, session }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [myRequests, setMyRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  const loadMyRequests = async () => {
    setRequestsLoading(true)
    const { data, error } = await supabase.from('e_card_requests').select('id,status,event_details,created_at,updated_at,generated_card_id').eq('user_id', session.user.id).order('created_at', { ascending: false })
    if (!error) setMyRequests(data || [])
    setRequestsLoading(false)
  }

  useEffect(() => { loadMyRequests() }, [session.user.id])
  const guests = useMemo(() => parseGuestList(form.guest_list_text), [form.guest_list_text])

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const submit = async event => {
    event.preventDefault()
    setMessage('')
    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.title.trim() || !form.event_date) {
      setMessage('Jaza jina, simu, jina la tukio na tarehe ya tukio.')
      return
    }
    if (!guests.length) {
      setMessage('Weka angalau jina moja la mgeni kwenye orodha ya wageni.')
      return
    }
    if (guests.length > 5000) {
      setMessage('Orodha ya ombi moja haiwezi kuzidi wageni 5,000.')
      return
    }
    if (guests.some(guest => !guest.guest_name || !guest.whatsapp_phone || !['single','double'].includes(guest.invite_type))) {
      setMessage('Orodha ya wageni haiko sahihi. Kila mstari uwe: Jina,namba ya WhatsApp,single au Jina,namba ya WhatsApp,double. Namba iwe sahihi.')
      return
    }
    if (form.location_url && !/^https:\/\//i.test(form.location_url)) {
      setMessage('Link ya ramani lazima ianze na https://')
      return
    }
    if (form.image_url && !/^https:\/\//i.test(form.image_url)) {
      setMessage('Link ya picha lazima ianze na https://')
      return
    }

    const { guest_list_text, ...eventDetails } = form
    setSaving(true)
    const { error } = await supabase.from('e_card_requests').insert({
      user_id: session.user.id,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      event_details: eventDetails,
      guest_list: guests
    })
    setSaving(false)
    if (error) {
      setMessage('Ombi halijatumwa: ' + error.message)
      return
    }
    setForm(EMPTY)
    setMessage('Ombi lako limepokelewa na ForteEvents. Timu yetu itashughulikia utengenezaji na usambazaji wa kadi.')
    await loadMyRequests()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Omba huduma ya E-card</h1>
          <p>ForteEvents ndiyo inayotengeneza kadi, kuandaa QR za wageni na kusimamia usambazaji wa mialiko.</p>
        </div>
      </div>
      <div className="card">
        <div className="ecard-sample-first-intro">
          <h2>Maelezo ya tukio</h2>
          <p>Jaza taarifa za tukio na orodha ya wageni. Hutachagua template wala kutengeneza kadi mwenyewe; timu ya ForteEvents itakutengenezea kadi rasmi.</p>
        </div>
        <form onSubmit={submit}>
          <label>Jina lako / jina la mratibu</label>
          <input value={form.customer_name} onChange={e => change('customer_name', e.target.value)} maxLength={100} required />
          <label>Namba ya simu</label>
          <input value={form.customer_phone} onChange={e => change('customer_phone', e.target.value)} maxLength={25} required />
          <label>Aina ya tukio</label>
          <select value={form.occasion} onChange={e => change('occasion', e.target.value)}>{OCCASIONS.map(item => <option key={item}>{item}</option>)}</select>
          <label>Jina / kichwa cha tukio</label>
          <input value={form.title} onChange={e => change('title', e.target.value)} maxLength={80} required />
          <label>Familia au taasisi inayoalika</label>
          <input value={form.host_names} onChange={e => change('host_names', e.target.value)} maxLength={120} />
          <label>Jina la bibi harusi (kama linahusika)</label>
          <input value={form.bride_name} onChange={e => change('bride_name', e.target.value)} maxLength={80} />
          <label>Jina la bwana harusi (kama linahusika)</label>
          <input value={form.groom_name} onChange={e => change('groom_name', e.target.value)} maxLength={80} />
          <label>Tarehe ya tukio</label>
          <input type="date" value={form.event_date} onChange={e => change('event_date', e.target.value)} required />
          <label>Muda wa tukio</label>
          <input type="time" value={form.event_time} onChange={e => change('event_time', e.target.value)} />
          <h3>Ratiba ya tukio (hiari)</h3>
          <label>Muda wa ibada</label>
          <input type="time" value={form.ceremony_time} onChange={e => change('ceremony_time', e.target.value)} />
          <label>Mahali pa ibada</label>
          <input value={form.ceremony_venue} onChange={e => change('ceremony_venue', e.target.value)} maxLength={120} />
          <label>Muda wa mapokezi</label>
          <input type="time" value={form.reception_time} onChange={e => change('reception_time', e.target.value)} />
          <label>Mahali pa mapokezi</label>
          <input value={form.reception_venue} onChange={e => change('reception_venue', e.target.value)} maxLength={120} />
          <label>Jina la ukumbi / eneo</label>
          <input value={form.venue} onChange={e => change('venue', e.target.value)} maxLength={160} />
          <label>Link ya Google Maps (hiari)</label>
          <input type="url" value={form.location_url} onChange={e => change('location_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." />
          <label>Link ya picha ya tukio / wahusika (hiari)</label>
          <input type="url" value={form.image_url} onChange={e => change('image_url', e.target.value)} placeholder="https://..." />
          <p className="ecard-form-hint">Tuma link ya picha ikiwa ungependa ionekane kwenye kadi. Kiolezo na mpangilio wa kadi vitasimamiwa na ForteEvents.</p>
          <label>Maelezo ya chakula / mapokezi (hiari)</label>
          <input value={form.food_note} onChange={e => change('food_note', e.target.value)} maxLength={160} />
          <label>Dress code (hiari)</label>
          <input value={form.dress_code} onChange={e => change('dress_code', e.target.value)} maxLength={100} />
          <label>Tarehe ya mwisho ya RSVP (hiari)</label>
          <input type="date" value={form.rsvp_deadline} onChange={e => change('rsvp_deadline', e.target.value)} />
          <label>Mawasiliano ya RSVP (hiari)</label>
          <input value={form.rsvp_contact_name} onChange={e => change('rsvp_contact_name', e.target.value)} placeholder="Jina la mawasiliano" maxLength={100} />
          <input value={form.rsvp_contact_phone} onChange={e => change('rsvp_contact_phone', e.target.value)} placeholder="Namba ya simu" maxLength={25} />
          <label>Mawasiliano ya pili (hiari)</label>
          <input value={form.rsvp_contact_name_2} onChange={e => change('rsvp_contact_name_2', e.target.value)} placeholder="Jina la mawasiliano" maxLength={100} />
          <input value={form.rsvp_contact_phone_2} onChange={e => change('rsvp_contact_phone_2', e.target.value)} placeholder="Namba ya simu" maxLength={25} />
          <label>Ujumbe wa familia (hiari)</label>
          <textarea rows="3" value={form.message} onChange={e => change('message', e.target.value)} maxLength={500} />
          <h3>Orodha ya wageni</h3>
          <p className="ecard-form-hint">Kila mwaliko unagharimu TSh 500 na salio la E-card ni tofauti na salio la SMS. Mwaliko wa double unaruhusu watu wawili kwa QR moja.</p>
          <p className="ecard-form-hint">Weka jina, namba ya WhatsApp na aina ya mwaliko. Mfano: Asha,0712345678,single au Juma,255712345678,double. Namba za 07... zitabadilishwa moja kwa moja kuwa 255...</p>
          <textarea rows="8" maxLength={300000} value={form.guest_list_text} onChange={e => change('guest_list_text', e.target.value)} placeholder={'Asha,0712345678,single\nJuma,255712345678,double'} required />
          <p className="ecard-form-hint">Wageni walioingizwa: {guests.length}</p>
          <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Inatuma ombi...' : 'Tuma ombi la E-card'}</button>
        </form>
        {message && <p className="message" role="status">{message}</p>}
      </div>
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}>
          <h2>Maombi yangu ya E-card</h2>
          <button type="button" className="secondary-button" onClick={loadMyRequests}>Refresh</button>
        </div>
        {requestsLoading ? <p>Inapakia historia ya maombi...</p> : myRequests.length === 0 ? <p>Bado hujatuma ombi la E-card.</p> : myRequests.map(request => (
          <div key={request.id} style={{borderBottom:'1px solid #eee',padding:'12px 0'}}>
            <strong>{request.event_details?.title || 'Tukio bila jina'}</strong>
            <p>{request.event_details?.event_date || '-'} · {STATUS_LABELS[request.status] || request.status}</p>
            {request.generated_card_id && <p>Kadi imetengenezwa na ForteEvents. Timu yetu itaendelea na maandalizi ya usambazaji.</p>}
            <small>{new Date(request.created_at).toLocaleString('sw-TZ')}</small>
          </div>
        ))}
      </div>
    </>
  )
}
