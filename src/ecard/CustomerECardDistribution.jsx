import { useCallback, useEffect, useState } from 'react'

export default function CustomerECardDistribution({ supabase, session }) {
  const [cards, setCards] = useState([])
  const [guestsByCard, setGuestsByCard] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    setError('')
    const { data: cardRows, error: cardError } = await supabase
      .from('e_cards')
      .select('id,title,occasion,slug,event_date,is_published,created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (cardError) {
      setError('Imeshindikana kupakia kadi: ' + cardError.message)
      setLoading(false)
      return
    }
    const publishedCards = (cardRows || []).filter(card => card.is_published)
    setCards(publishedCards)
    if (publishedCards.length) {
      const ids = publishedCards.map(card => card.id)
      const { data: guests, error: guestError } = await supabase
        .from('e_card_guests')
        .select('id,card_id,guest_name,whatsapp_phone,invite_type,token,whatsapp_delivery_status')
        .in('card_id', ids)
        .order('created_at', { ascending: false })
      if (guestError) setError('Kadi zimeonekana, lakini wageni hawakupakiwa: ' + guestError.message)
      else {
        const grouped = {}
        for (const guest of guests || []) (grouped[guest.card_id] ||= []).push(guest)
        setGuestsByCard(grouped)
      }
    } else setGuestsByCard({})
    setLoading(false)
  }, [supabase, session?.user?.id])

  useEffect(() => { load() }, [load])

  const guestUrl = (card, guest) => {
    const url = new URL(window.location.origin + '/')
    url.searchParams.set('card', card.slug)
    url.searchParams.set('guest', guest.token)
    return url.toString()
  }

  const sendWhatsApp = (card, guest) => {
    if (!guest.whatsapp_phone) return
    const phone = String(guest.whatsapp_phone).replace(/\D/g, '')
    const message = `Habari ${guest.guest_name}, unakaribishwa kwenye ${card.title || card.occasion || 'tukio letu'}. Fungua kadi yako hapa: ${guestUrl(card, guest)}`
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="card" style={{ marginTop: 18 }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div>
          <h2 style={{marginBottom:4}}>Kadi zangu zilizotengenezwa</h2>
          <p style={{marginTop:0}}>Fungua kadi na utume mwaliko kwa mgeni kupitia WhatsApp.</p>
        </div>
        <button type="button" className="secondary-button" onClick={load} disabled={loading}>Refresh</button>
      </div>
      {loading ? <p>Inapakia kadi zako...</p> : error ? <p role="alert">{error}</p> : cards.length === 0 ? <p>Bado hakuna kadi iliyochapishwa kwenye akaunti hii.</p> : cards.map(card => (
        <div key={card.id} style={{borderTop:'1px solid #e8e1d5',padding:'14px 0'}}>
          <strong>{card.title || card.occasion || 'Kadi ya mwaliko'}</strong>
          <p style={{margin:'5px 0 10px'}}>Tarehe: {card.event_date || 'Haijawekwa'} · Wageni: {(guestsByCard[card.id] || []).length}</p>
          {(guestsByCard[card.id] || []).length === 0 ? <p>Hakuna wageni waliounganishwa na kadi hii.</p> : (guestsByCard[card.id] || []).map(guest => (
            <div key={guest.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap',padding:'9px 0',borderTop:'1px solid #f1eee8'}}>
              <div>
                <strong>{guest.guest_name}</strong>
                <div style={{fontSize:12,color:'#746b5d'}}>{guest.whatsapp_phone || 'Hakuna namba'} · {guest.whatsapp_delivery_status || 'pending'}</div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <a className="secondary-button" href={guestUrl(card, guest)} target="_blank" rel="noreferrer">Fungua kadi</a>
                <button type="button" className="primary-button" onClick={() => sendWhatsApp(card, guest)} disabled={!guest.whatsapp_phone}>Tuma WhatsApp</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}
