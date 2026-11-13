import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

export default function ECardCheckin({ supabase, session }) {
  const [cards, setCards] = useState([])
  const [cardId, setCardId] = useState('')
  const [guests, setGuests] = useState([])
  const [staff, setStaff] = useState([])
  const [role, setRole] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffPhone, setStaffPhone] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef(null)

  const loadCards = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_e_card_checkin_cards')
    if (error) { setMessage('Imeshindikana kupakia matukio: ' + error.message); return }
    const rows = data || []
    setCards(rows)
    if (cardId && !rows.some(row => row.card_id === cardId)) setCardId('')
  }, [supabase, cardId])

  const loadGuests = useCallback(async (id) => {
    if (!id) { setGuests([]); setStaff([]); setRole(''); return }
    const selected = cards.find(row => row.card_id === id)
    setRole(selected?.access_role || '')
    const { data, error } = await supabase.rpc('get_e_card_checkin_guests', { p_card_id: id })
    if (error) { setMessage('Imeshindikana kupakia wageni: ' + error.message); return }
    setGuests(data || [])
    if (selected?.access_role === 'owner') {
      const { data: assigned, error: staffError } = await supabase
        .from('e_card_checkin_staff')
        .select('id, staff_name, staff_phone, staff_user_id, created_at')
        .eq('card_id', id).order('created_at', { ascending: true })
      if (staffError) setMessage('Wageni wamepakiwa lakini orodha ya ma-usher haijapatikana: ' + staffError.message)
      else setStaff(assigned || [])
    } else setStaff([])
  }, [supabase, cards])

  useEffect(() => { loadCards() }, [loadCards])
  useEffect(() => { loadGuests(cardId) }, [cardId, loadGuests])

  const checkIn = async (rawValue) => {
    let token = String(rawValue || '').trim()
    try { token = new URL(token).searchParams.get('guest') || token } catch {}
    const match = token.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
    if (match) token = match[0]
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      setMessage('QR haijasomeka vizuri. Tumia QR ya mgeni husika.')
      return
    }
    setBusy(true)
    const { data, error } = await supabase.rpc('check_in_e_card_guest', { p_token: token })
    setBusy(false)
    if (error) { setMessage(error.message || 'QR haijatambulika.'); return }
    const guest = Array.isArray(data) ? data[0] : data
    if (!guest) { setMessage('QR haijatambulika.'); return }
    setManualToken('')
    setMessage(guest.already_checked_in
      ? 'TAHADHARI: ' + guest.guest_name + ' tayari aliingia. Usirudie kumhesabu.'
      : 'IMEKUBALIWA: ' + guest.guest_name + ' — ' + guest.invite_type.toUpperCase() + ' (' + guest.guest_count + ' watu).')
    await loadGuests(cardId)
  }

  const startScanner = async () => {
    if (!cardId || scannerActive) return
    try {
      setMessage('')
      setScannerActive(true)
      await new Promise(resolve => requestAnimationFrame(resolve))
      const scanner = new Html5Qrcode('forte-checkin-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false
      })
      scannerRef.current = scanner
      let handled = false
      await scanner.start({ facingMode: 'environment' },
        { fps: 12, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        async decoded => {
          if (handled) return
          handled = true
          await stopScanner()
          await checkIn(decoded)
        }, () => {})
    } catch (error) {
      await stopScanner()
      setMessage('Imeshindikana kuwasha kamera. Ruhusu camera kwenye browser na tumia HTTPS. ' + error.message)
    }
  }

  const stopScanner = async () => {
    const scanner = scannerRef.current
    if (scanner) {
      try { await scanner.stop() } catch {}
      try { await scanner.clear() } catch {}
      scannerRef.current = null
    }
    setScannerActive(false)
  }

  useEffect(() => () => { stopScanner() }, [])

  const addStaff = async (event) => {
    event.preventDefault()
    if (!cardId || !staffEmail.trim()) return
    setBusy(true)
    const { error } = await supabase.rpc('add_e_card_checkin_staff', {
      p_card_id: cardId, p_staff_email: staffEmail.trim(),
      p_staff_name: staffName.trim(), p_staff_phone: staffPhone.trim()
    })
    setBusy(false)
    if (error) { setMessage('Msaidizi hakuongezwa: ' + error.message); return }
    setStaffEmail(''); setStaffName(''); setStaffPhone('')
    setMessage('Msaidizi amepewa ruhusa ya kuscan tukio hili pekee.')
    await loadGuests(cardId)
  }

  const removeStaff = async (assignment) => {
    if (!window.confirm('Una uhakika unataka kuondoa ruhusa ya msaidizi huyu?')) return
    setBusy(true)
    const { data, error } = await supabase.rpc('remove_e_card_checkin_staff', { p_assignment_id: assignment.id })
    setBusy(false)
    if (error) { setMessage('Ruhusa haijaondolewa: ' + error.message); return }
    setMessage(data ? 'Ruhusa ya msaidizi imeondolewa.' : 'Ruhusa haikupatikana.')
    await loadGuests(cardId)
  }

  const checkedIn = guests.filter(item => item.checked_in_at).length
  const remaining = guests.length - checkedIn
  const selectedCard = cards.find(item => item.card_id === cardId)

  return <div className="card" style={{display:'grid',gap:16}}>
    <div>
      <h1>ForteEvents — QR Check-in</h1>
      <p>Chagua tukio ulilopewa ruhusa. Kila QR itathibitishwa mara moja tu.</p>
    </div>
    <label style={{display:'grid',gap:6}}>Chagua tukio
      <select value={cardId} onChange={event => { setCardId(event.target.value); setMessage('') }}>
        <option value="">Chagua tukio</option>
        {cards.map(card => <option key={card.card_id} value={card.card_id}>{card.title || 'Tukio'}{card.event_date ? ' — '+card.event_date : ''}</option>)}
      </select>
    </label>
    {selectedCard && <div style={{background:'#fffaf0',border:'1px solid #d6bd78',borderRadius:10,padding:12,color:'#4a3a18'}}>
      <strong>{selectedCard.title}</strong>
      <div>{selectedCard.event_date || 'Tarehe haijawekwa'} {selectedCard.venue ? ' · '+selectedCard.venue : ''}</div>
      <small>{role === 'owner' ? 'Mmiliki wa tukio' : 'M-usher aliyeidhinishwa'}</small>
    </div>}
    {cardId && <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8}}>
      <div className="card"><strong>{guests.length}</strong><small style={{display:'block'}}>Wageni wote</small></div>
      <div className="card"><strong>{checkedIn}</strong><small style={{display:'block'}}>Wameingia</small></div>
      <div className="card"><strong>{remaining}</strong><small style={{display:'block'}}>Bado</small></div>
    </div>}
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button type="button" className="primary-button" onClick={startScanner} disabled={!cardId || scannerActive || busy}>{scannerActive ? 'Scanner inafanya kazi...' : 'Washa kamera kuscan QR'}</button>
      {scannerActive && <button type="button" className="secondary-button" onClick={stopScanner}>Zima kamera</button>}
    </div>
    <div id="forte-checkin-reader" style={{width:'100%',maxWidth:420,display:scannerActive?'block':'none'}}/>
    <label style={{display:'grid',gap:6}}>Au ingiza QR token
      <input value={manualToken} onChange={event => setManualToken(event.target.value)} placeholder="Scan / bandika QR token"/>
    </label>
    <button type="button" className="secondary-button" onClick={() => checkIn(manualToken)} disabled={!cardId || busy || !manualToken.trim()}>{busy ? 'Inathibitisha...' : 'Thibitisha kuingia'}</button>
    {message && <p role="status" className="message">{message}</p>}
    {role === 'owner' && cardId && <section style={{borderTop:'1px solid #e5d9bd',paddingTop:16}}>
      <h2>Wasimamizi / Ma-usher</h2>
      <p>Weka barua pepe ya mtu mwenye akaunti ya ForteEvents. Ataruhusiwa kuscan tukio hili tu.</p>
      <form onSubmit={addStaff} style={{display:'grid',gap:8}}>
        <label>Barua pepe ya akaunti ya usher<input type="email" required value={staffEmail} onChange={event=>setStaffEmail(event.target.value)} placeholder="usher@example.com"/></label>
        <label>Jina la kuonyesha (hiari)<input value={staffName} onChange={event=>setStaffName(event.target.value)} /></label>
        <label>Namba ya simu (hiari)<input value={staffPhone} onChange={event=>setStaffPhone(event.target.value)} /></label>
        <button className="primary-button" disabled={busy || !staffEmail.trim()}>{busy ? 'Inahifadhi...' : 'Mpa ruhusa ya kuscan'}</button>
      </form>
      {staff.map(person=><div key={person.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,borderBottom:'1px solid #eee',padding:'10px 0'}}>
        <div><strong>{person.staff_name || 'Msaidizi'}</strong><small style={{display:'block'}}>{person.staff_phone || 'Namba haijawekwa'}</small></div>
        <button type="button" className="danger-button" disabled={busy} onClick={()=>removeStaff(person)}>Ondoa ruhusa</button>
      </div>)}
      {staff.length===0 && <p>Bado hujaongeza msaidizi.</p>}
    </section>}
    <section style={{borderTop:'1px solid #e5d9bd',paddingTop:16}}>
      <h2>Ripoti ya wageni ({guests.length})</h2>
      {guests.map(guest=><div key={guest.guest_id} style={{display:'flex',justifyContent:'space-between',gap:8,padding:'9px 0',borderBottom:'1px solid #eee'}}>
        <div><strong>{guest.guest_name}</strong><small style={{display:'block'}}>{guest.invite_type?.toUpperCase()} · {guest.guest_count} mtu/watu</small></div>
        <span style={{color:guest.checked_in_at?'#287a45':'#8a6b28',fontWeight:600}}>{guest.checked_in_at?'Ameingia':'Hajaingia'}</span>
      </div>)}
      {cardId && guests.length===0 && <p>Bado hakuna wageni walioandikishwa kwenye tukio hili.</p>}
    </section>
    <small style={{color:'#776b55'}}>M-usher hawezi kuona wageni wa matukio mengine, salio, au taarifa za akaunti ya mteja.</small>
  </div>
}
