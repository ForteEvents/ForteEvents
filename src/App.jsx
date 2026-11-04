import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import QRCode from 'qrcode'
import { supabase } from './supabaseClient'
import './App.css'


function GuestQr({ value, alt = 'QR ya mwaliko', style }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    setSrc('')
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 260,
      color: { dark: '#000000', light: '#FFFFFF' }
    }).then(dataUrl => {
      if (active) setSrc(dataUrl)
    }).catch(() => {
      if (active) setSrc('')
    })
    return () => { active = false }
  }, [value])
  return src ? <img alt={alt} src={src} style={style} /> : <span role="status">Inaandaa QR...</span>
}


const DEFAULT_ECARD_MESSAGE='Karibu sana, uwepo wako kwetu ni furaha na heshima kubwa. Tunatazamia kusherehekea nawe siku hii ya pekee.'
function buildECardInvitationParts(card,recipientName='[JINA LA MWALIKWA]'){
 const occasion=String(card?.occasion||'').toLowerCase();let eventLine,coupleName=''
 if(occasion.includes('send'))eventLine='kwenye send-off ya binti yao '+(card?.title||'[JINA LA MHUSIKA]')+'.'
 else if(occasion.includes('harusi')){coupleName=[card?.bride_name,card?.groom_name].filter(Boolean).join(' na ')||card?.title||'[MAJINA YA BIBI NA BWANA HARUSI]';eventLine='kwenye harusi ya vijana wao wapendwa'}
 else eventLine='kwenye '+String(card?.occasion||'tukio').toLowerCase()+' ya '+(card?.title||'[JINA LA TUKIO]')+'.'
 return {intro:'Wanayo furaha kukualika',titles:'Bw. & Bi. Mhe. Pro. Dkt. Mch. Eng. Bw. au Bi.',recipient:recipientName||'[JINA LA MWALIKWA]',eventLine,coupleName}
}
function ECardInvitationCopy({card,recipientName,className=''}){const p=buildECardInvitationParts(card,recipientName);return <div className={['ecard-invitation-copy',className].filter(Boolean).join(' ')}><p>{p.intro}</p><strong className="ecard-invitation-titles">{p.titles}</strong><strong className="ecard-invitation-recipient">— {p.recipient} —</strong><p>{p.eventLine}</p>{p.coupleName&&<strong className="ecard-invitation-couple">— {p.coupleName} —</strong>}</div>}
function ECardFloralOrnament({className=''}){return <svg className={['ecard-floral-ornament',className].filter(Boolean).join(' ')} viewBox="0 0 260 205" aria-hidden="true" focusable="false"><g fill="none" stroke="#79503a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 196 C48 164 65 128 93 104 C124 77 169 61 245 8"/><path d="M47 163 C19 159 10 137 14 116 C39 120 54 139 47 163Z" fill="#b7a47b"/><path d="M79 128 C51 123 43 101 49 82 C73 89 86 107 79 128Z" fill="#d0bd91"/><path d="M124 89 C99 82 94 60 103 43 C126 52 137 70 124 89Z" fill="#b7a47b"/><path d="M178 57 C157 42 158 21 174 7 C192 24 194 43 178 57Z" fill="#d0bd91"/></g><g stroke="#9a5632" strokeWidth="2.2" fill="#e98b50"><ellipse cx="174" cy="106" rx="13" ry="30"/><ellipse cx="174" cy="106" rx="13" ry="30" transform="rotate(45 174 106)"/><ellipse cx="174" cy="106" rx="13" ry="30" transform="rotate(90 174 106)"/><ellipse cx="174" cy="106" rx="13" ry="30" transform="rotate(135 174 106)"/><circle cx="174" cy="106" r="11" fill="#a85a31"/><ellipse cx="104" cy="53" rx="10" ry="23" fill="#f1b17d"/><ellipse cx="104" cy="53" rx="10" ry="23" transform="rotate(45 104 53)"/><ellipse cx="104" cy="53" rx="10" ry="23" transform="rotate(90 104 53)"/><ellipse cx="104" cy="53" rx="10" ry="23" transform="rotate(135 104 53)"/><circle cx="104" cy="53" r="8" fill="#a85a31"/></g><g fill="#d8b48a" stroke="#8c593b" strokeWidth="1.5"><circle cx="174" cy="106" r="4"/><circle cx="104" cy="53" r="3"/></g></svg>}
function buildECardDetailItems(card){return [['TAREHE',card?.event_date],['MUDA',card?.event_time?'Saa '+card.event_time:''],['IBADA',[card?.ceremony_time,card?.ceremony_venue].filter(Boolean).join(' · ')],['MAPOKEZI',[card?.reception_time,card?.reception_venue].filter(Boolean).join(' · ')],['MAHALI',card?.venue],['CHAKULA',card?.food_note],['DRESS CODE',[card?.dress_code,...(card?.dress_colors||[])].filter(Boolean).join(' · ')],['RSVP',card?.rsvp_deadline?'Mwisho wa kuthibitisha: '+card.rsvp_deadline:''],['MAWASILIANO 1',[card?.rsvp_contact_name,card?.rsvp_contact_phone].filter(Boolean).join(' · ')],['MAWASILIANO 2',[card?.rsvp_contact_name_2,card?.rsvp_contact_phone_2].filter(Boolean).join(' · ')]].filter(([,v])=>Boolean(v))}
function ECardDetails({card,className='',showDate=true}){const colors={gold:'#c69a32',cream:'#f2e6c9',white:'#fff',black:'#222',red:'#b52d35',blue:'#3567a8',navy:'#182b4b',pink:'#e8a6b8',green:'#477b53',silver:'#c7cbd1',purple:'#76518e',brown:'#79533a',orange:'#d97927',maroon:'#702b3b',beige:'#d9c6a0',grey:'#888',gray:'#888'};return <div className={['ecard-detail-flow',className].filter(Boolean).join(' ')}>{buildECardDetailItems(card).filter(([label])=>showDate||label!=='TAREHE').map(([label,value])=><p className="ecard-detail-line" key={label}><b>{label}</b><span>{label==='DRESS CODE'?<>{card?.dress_code&&<>{card.dress_code} </>}{(card?.dress_colors||[]).map((color,i)=><span className="ecard-dress-swatch-item" key={color+i}><i style={{backgroundColor:colors[String(color).toLowerCase()]||'#d8c49b'}}/>{color}</span>)}</>:label==='MAWASILIANO 1'?<><strong>{card?.rsvp_contact_name}</strong>{card?.rsvp_contact_phone&&<a className="ecard-phone-link" href={'tel:'+card.rsvp_contact_phone}>{card.rsvp_contact_phone}</a>}</>:label==='MAWASILIANO 2'?<><strong>{card?.rsvp_contact_name_2}</strong>{card?.rsvp_contact_phone_2&&<a className="ecard-phone-link" href={'tel:'+card.rsvp_contact_phone_2}>{card.rsvp_contact_phone_2}</a>}</>:value}</span></p>)}</div>}

function ECardFamilyMessage({message}) {
  const value = String(message || '').trim() || DEFAULT_ECARD_MESSAGE
  const sentences = value.split(/(?<=[.!?])\s+/).map(part => part.trim()).filter(Boolean)
  return <div className="ecard-family-message">{sentences.map((sentence,index)=><p key={index}>{sentence}</p>)}</div>
}


async function createECardPng(card, guest = null) {
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  const invitationUrl = guest
    ? window.location.origin + '/?card=' + encodeURIComponent(card.slug) + '&guest=' + encodeURIComponent(guest.token)
    : window.location.origin + '/?card=' + encodeURIComponent(card.slug || '')
  const qrImage = await QRCode.toDataURL(invitationUrl, { errorCorrectionLevel: 'H', margin: 1, width: 260, color: { dark: '#000000', light: '#FFFFFF' } })
  let logoDataUrl = ''
  try {
    const logoResponse = await fetch('/forteevents-logo.png')
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob()
      logoDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = reject
        reader.readAsDataURL(logoBlob)
      })
    }
  } catch (error) { console.warn('ForteEvents logo haikuweza kupakiwa kwenye kadi:', error) }
  const date = card.event_date ? new Date(card.event_date + 'T00:00:00').toLocaleDateString('sw-TZ', {day:'numeric',month:'long',year:'numeric'}) : 'Tarehe ya tukio'
  const guestName = guest?.guest_name || 'JINA LA MWALIKWA'
  const guestType = guest ? (guest.invite_type || 'single').toUpperCase() : 'GUEST PASS'
  const invitationParts=buildECardInvitationParts(card,guestName)
  const invitationLines=[invitationParts.intro,invitationParts.titles,'— '+invitationParts.recipient+' —',invitationParts.eventLine,...(invitationParts.coupleName?['— '+invitationParts.coupleName+' —']:[])]
  const details = buildECardDetailItems(card).filter(([label]) => label !== 'TAREHE')
  const wrapSvg = (value, max = 34) => {
    const words = String(value ?? '').split(/\s+/)
    const lines = []
    let line = ''
    for (const word of words) {
      if (line && (line + ' ' + word).length > max) { lines.push(line); line = word }
      else line = line ? line + ' ' + word : word
    }
    if (line) lines.push(line)
    return lines.slice(0, 2)
  }
  const detailSvg = details.map(([label,value],i) => {
    const x = i % 2 === 0 ? 105 : 585
    const y = 600 + Math.floor(i / 2) * 66
    const isContact = label.startsWith('MAWASILIANO')
    const lines = wrapSvg(value, 34)
    if (isContact) return '<g><text x="'+(x+5)+'" y="'+(y+18)+'" font-family="Arial" font-size="13" font-weight="bold" letter-spacing="1.4" fill="#9a5935">'+esc(label)+'</text><text x="'+(x+5)+'" y="'+(y+39)+'" font-family="Georgia" font-size="20" fill="#493321">'+lines.map((line,j)=>'<tspan x="'+(x+5)+'" dy="'+(j?19:0)+'">'+esc(line)+'</tspan>').join('')+'</text><path d="M'+x+' '+(y+48)+' h410" stroke="#d9c5a6" stroke-width="1"/></g>'
    return '<g><rect x="'+x+'" y="'+y+'" width="440" height="48" rx="10" fill="#fffaf0" fill-opacity=".94" stroke="#d8bc7d" stroke-width="1.3"/><path d="M'+(x+13)+' '+(y+8)+' v32" stroke="#bd8b2d" stroke-width="3" stroke-linecap="round"/><text x="'+(x+27)+'" y="'+(y+18)+'" font-family="Arial" font-size="13" font-weight="bold" letter-spacing="1.4" fill="#a16c22">'+esc(label)+'</text><text x="'+(x+27)+'" y="'+(y+38)+'" font-family="Georgia" font-size="20" fill="#493321">'+lines.map((line,j)=>'<tspan x="'+(x+27)+'" dy="'+(j?17:0)+'">'+esc(line)+'</tspan>').join('')+'</text></g>'
  }).join('')
  const familyMessage = String(card?.message||'').trim() || DEFAULT_ECARD_MESSAGE
  const familyLines = wrapSvg(familyMessage, 58)
  const familyMessageSvg = '<text x="650" y="925" text-anchor="middle" font-family="Georgia" font-size="22" font-style="italic" fill="#59452a">'+familyLines.map((line,i)=>'<tspan x="650" dy="'+(i?31:0)+'">'+esc(line)+'</tspan>').join('')+'</text>'
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1536" height="1024" viewBox="0 0 1536 1024">'+
    '<defs><linearGradient id="gold" x2="1" y2="1"><stop stop-color="#a96b09"/><stop offset=".48" stop-color="#ffe18a"/><stop offset="1" stop-color="#b7790c"/></linearGradient><linearGradient id="paper" x2="0" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#f8efdf"/></linearGradient><linearGradient id="logoBg" x2="0" y2="1"><stop stop-color="#352319"/><stop offset="1" stop-color="#17100c"/></linearGradient></defs>'+
    '<rect width="1536" height="1024" fill="url(#paper)"/><rect x="20" y="20" width="1496" height="984" rx="8" fill="none" stroke="url(#gold)" stroke-width="8"/><rect x="34" y="34" width="1468" height="956" fill="none" stroke="#d6a33d" stroke-width="2"/>'+
    '<path d="M1030 20 C1125 90 1165 160 1015 240 M45 760 C155 810 205 895 340 980" fill="none" stroke="#d9b66b" stroke-width="3" opacity=".5"/>'+
    '<g transform="translate(820 12) scale(1.12)" stroke-linecap="round" stroke-linejoin="round"><path d="M12 205 C65 155 90 95 190 20" fill="none" stroke="#79503a" stroke-width="5"/><path d="M68 150 C28 151 14 125 22 96 C55 101 76 122 68 150Z" fill="#a9a77d" stroke="#79503a" stroke-width="2"/><path d="M116 105 C80 99 72 70 88 45 C118 56 132 80 116 105Z" fill="#d0bd91" stroke="#79503a" stroke-width="2"/><path d="M153 67 C127 51 132 23 153 8 C177 29 178 51 153 67Z" fill="#a9a77d" stroke="#79503a" stroke-width="2"/><g transform="translate(192 105)" fill="#e99a69" stroke="#9a5632" stroke-width="2"><ellipse cy="-27" rx="15" ry="31"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(45)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(90)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(135)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(180)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(225)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(270)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(315)"/><circle r="15" fill="#a85a31"/><circle r="6" fill="#f3d29a" stroke="none"/></g><g transform="translate(92 45) scale(.68)" fill="#f2c49a" stroke="#9a5632" stroke-width="2"><ellipse cy="-24" rx="13" ry="27"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(45)"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(90)"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(135)"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(180)"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(225)"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(270)"/><ellipse cy="-24" rx="13" ry="27" transform="rotate(315)"/><circle r="12" fill="#a85a31"/></g></g>'+
    '<g transform="translate(38 805) rotate(180 125 100) scale(.9)" stroke-linecap="round" stroke-linejoin="round"><path d="M12 205 C65 155 90 95 190 20" fill="none" stroke="#79503a" stroke-width="5"/><path d="M68 150 C28 151 14 125 22 96 C55 101 76 122 68 150Z" fill="#a9a77d" stroke="#79503a" stroke-width="2"/><path d="M116 105 C80 99 72 70 88 45 C118 56 132 80 116 105Z" fill="#d0bd91" stroke="#79503a" stroke-width="2"/><g transform="translate(192 105)" fill="#e99a69" stroke="#9a5632" stroke-width="2"><ellipse cy="-27" rx="15" ry="31"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(45)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(90)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(135)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(180)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(225)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(270)"/><ellipse cy="-27" rx="15" ry="31" transform="rotate(315)"/><circle r="15" fill="#a85a31"/><circle r="6" fill="#f3d29a" stroke="none"/></g></g>'+
    '<rect x="43" y="37" width="275" height="154" rx="18" fill="url(#logoBg)" stroke="#c99a42" stroke-width="3"/><rect x="50" y="44" width="261" height="140" rx="12" fill="none" stroke="#f0d18a" stroke-opacity=".42" stroke-width="1.5"/><image x="58" y="48" width="245" height="132" preserveAspectRatio="xMidYMid meet" href="'+logoDataUrl+'" xlink:href="'+logoDataUrl+'"/>'+
    '<text x="650" y="125" text-anchor="middle" font-family="Georgia" font-size="30" font-weight="bold" letter-spacing="4" fill="#8a5a12">KADI YA MWALIKO</text><text x="650" y="190" text-anchor="middle" font-family="Georgia" font-size="68" font-style="italic" font-weight="bold" fill="#b77c16">'+esc((card.occasion || 'MWALIKO').toUpperCase())+'</text><text x="650" y="235" text-anchor="middle" font-family="Georgia" font-size="25" letter-spacing="6" fill="#23190f">INVITATION</text>'+
    '<path d="M390 218 H920" stroke="url(#gold)" stroke-width="3"/><text x="655" y="210" text-anchor="middle" font-size="26" fill="#b47a18">♥</text>'+
    '<text x="650" y="285" text-anchor="middle" font-family="Georgia" font-size="28" fill="#21170f">Familia ya</text><text x="650" y="335" text-anchor="middle" font-family="Georgia" font-size="48" font-weight="bold" font-style="italic" letter-spacing="1.2" fill="#3b2818">'+esc(card.host_names || 'JINA LA FAMILIA')+'</text>'+
    '<text x="650" y="378" text-anchor="middle" font-family="Georgia" font-size="21" font-style="italic" fill="#21170f">'+esc(invitationParts.intro)+'</text>'+
    '<text x="650" y="410" text-anchor="middle" font-family="Georgia" font-size="14" fill="#79503a">'+esc(invitationParts.titles)+'</text>'+
    '<text x="650" y="456" text-anchor="middle" font-family="Georgia" font-size="33" font-weight="bold" font-style="italic" fill="#9d5633">'+esc("— "+invitationParts.recipient+" —")+'</text>'+
    '<text x="650" y="496" text-anchor="middle" font-family="Georgia" font-size="19" fill="#21170f">'+esc(invitationParts.eventLine)+'</text>'+
    (invitationParts.coupleName?'<text x="650" y="542" text-anchor="middle" font-family="Georgia" font-size="36" font-weight="bold" font-style="italic" letter-spacing="1" fill="#754a34">'+esc("— "+invitationParts.coupleName+" —")+'</text>':'')+
    '<text x="650" y="'+(invitationParts.coupleName?585:550)+'" text-anchor="middle" font-family="Georgia" font-size="27" fill="#21170f">'+esc(date)+'</text>'+
    detailSvg+
    familyMessageSvg+
    '<rect x="1080" y="205" width="360" height="740" rx="48" fill="#fffdf8" stroke="url(#gold)" stroke-width="7"/><path d="M1110 250 H1410" stroke="#d2a33e" stroke-width="2"/>'+
    '<rect x="1090" y="245" width="340" height="66" rx="8" fill="url(#gold)"/><text x="1260" y="289" text-anchor="middle" font-family="Georgia" font-size="29" font-weight="bold" fill="#24190b">YOUR GUEST PASS</text>'+
    '<text x="1260" y="380" text-anchor="middle" font-family="Georgia" font-size="34" font-weight="bold" fill="#20170f">'+esc(guestName)+'</text><path d="M1120 405 H1400" stroke="#d5ad58" stroke-width="2"/>'+
    '<rect x="1120" y="430" width="280" height="54" rx="24" fill="#24190f" stroke="#d6a33d" stroke-width="3"/><text x="1260" y="466" text-anchor="middle" font-family="Arial" font-size="25" font-weight="bold" fill="#fff">'+esc(guestType === "SINGLE" ? "SINGLE · MTU 1" : guestType === "DOUBLE" ? "DOUBLE · WATU 2" : guestType)+'</text>'+
    '<rect x="1115" y="510" width="290" height="290" rx="16" fill="#fff" stroke="#c18a1c" stroke-width="4"/><image x="1130" y="525" width="260" height="260" href="'+qrImage+'" xlink:href="'+qrImage+'"/>'+
    '<rect x="1120" y="820" width="280" height="54" rx="22" fill="#b77a0d"/><text x="1260" y="855" text-anchor="middle" font-family="Arial" font-size="22" fill="#fff">✓  Scan at Check-in</text>'+
    '<text x="1260" y="895" text-anchor="middle" font-family="Georgia" font-size="14" font-weight="bold" fill="#9a5935">SCAN: KADI KAMILI + RAMANI</text><text x="1260" y="925" text-anchor="middle" font-family="Georgia" font-size="14" font-style="italic" fill="#59402f">ForteEvents · Make your event extraordinary</text></svg>'
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  try {
    const image = new Image()
    image.src = objectUrl
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject })
    const canvas = document.createElement('canvas')
    canvas.width = 1536; canvas.height = 1024
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    return await new Promise((resolve, reject) => canvas.toBlob(file => file ? resolve(file) : reject(new Error('PNG haikuundwa.')), 'image/png'))
  } finally { URL.revokeObjectURL(objectUrl) }
}

async function shareECard(card, mode, setMessage) {
  const url = window.location.origin + '/?card=' + encodeURIComponent(card.slug)
  const mapLink = String(card?.location_url || '').trim()
  const message = `Habari! Tunakualika kwenye ${card.title}.\n\nKIUNGO CHA KADI:\n${url}${mapLink ? '\n\nKIUNGO CHA RAMANI YA UKUMBI:\n' + mapLink : ''}`
  if (mode === 'link') { window.open('https://wa.me/?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer'); return }
  try {
    const png = await createECardPng(card)
    const file = new File([png], 'ForteEvents-mwaliko.png', {type:'image/png'})
    if (navigator.share && navigator.canShare?.({files:[file]})) { await navigator.share({files:[file],text:message,title:card.title}); setMessage('Shiriki picha pamoja na ujumbe wenye kiungo cha kadi kamili; ramani itafunguka kupitia kiungo au QR.'); return }
    const downloadUrl=URL.createObjectURL(png); const anchor=document.createElement('a'); anchor.href=downloadUrl; anchor.download='ForteEvents-mwaliko.png'; anchor.click(); URL.revokeObjectURL(downloadUrl)
    window.open('https://wa.me/?text='+encodeURIComponent(message),'_blank','noopener,noreferrer')
    setMessage('Picha imepakuliwa na WhatsApp imefunguliwa. Ambatisha picha pamoja na kiungo kilichoandaliwa ili mteja afungue ramani.')
  } catch(error) { setMessage('Imeshindikana kuandaa picha ya mwaliko: '+error.message) }
}

function AdminCustomers({ session, onBack }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [smsHistory, setSmsHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [eCardTransactions, setECardTransactions] = useState([])
  const [eCardHistoryLoading, setECardHistoryLoading] = useState(false)
  const [eCardAmount, setECardAmount] = useState('')
  const [eCardDescription, setECardDescription] = useState('Malipo ya E-card yaliyopokelewa')
  const [eCardBusy, setECardBusy] = useState(false)
  const [adminECardAccounts, setAdminECardAccounts] = useState([])

  const loadCustomers = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [response, accountResult] = await Promise.all([
        fetch('https://forteevents.onrender.com/api/admin/customers', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase.rpc('admin_get_e_card_accounts')
      ])
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'Wateja hawakuweza kupakiwa.')
      if (accountResult.error) throw accountResult.error
      setAdminECardAccounts(accountResult.data || [])
      const rows = result.customers || []
      setCustomers(rows.map(customer => {
        const extra = (accountResult.data || []).find(item => item.user_id === customer.id) || {}
        return { ...customer, e_card_balance: extra.e_card_balance || 0,
          e_cards_count: extra.cards_count || 0, e_card_invitations: extra.invitations_count || 0,
          e_card_checked_in: extra.checked_in_count || 0 }
      }))
    } catch (error) {
      setErrorMessage('Taarifa za wateja hazijapakiwa: ' + error.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { if (session?.access_token) loadCustomers() }, [session?.access_token])

  const loadSmsHistory = async (customer) => {
    setHistoryLoading(true); setHistoryError(''); setSmsHistory([])
    try {
      const response = await fetch(`https://forteevents.onrender.com/api/admin/customers/${customer.id}/sms-history`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'SMS history haikupatikana.')
      setSmsHistory(result.history || [])
    } catch (error) { setHistoryError(error.message) }
    finally { setHistoryLoading(false) }
  }

  const loadECardTransactions = async (customer) => {
    setECardHistoryLoading(true); setECardTransactions([])
    const { data, error } = await supabase.rpc('admin_get_e_card_transactions', { p_user_id: customer.id })
    if (error) setHistoryError('E-card history: ' + error.message)
    else setECardTransactions(data || [])
    setECardHistoryLoading(false)
  }

  const openCustomerDetails = (customer) => {
    setSelectedCustomer(customer); setHistoryError('')
    loadSmsHistory(customer); loadECardTransactions(customer)
  }

  const addCredits = async (customer) => {
    const amount = window.prompt(`Ongeza SMS credits kwa ${customer.full_name || customer.email}:`)
    if (!amount) return
    const creditAmount = Number(amount)
    if (!Number.isInteger(creditAmount) || creditAmount <= 0) return window.alert('Weka idadi sahihi ya SMS credits.')
    try {
      const response = await fetch('https://forteevents.onrender.com/api/admin/credits/add', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId: customer.id, amount: creditAmount, reference: 'Admin credit' })
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'SMS credits hazikuongezwa.')
      window.alert(`SMS credits zimeongezwa. Salio jipya: ${result.balance}`)
      await loadCustomers()
      setSelectedCustomer(current => current ? { ...current, sms_balance: result.balance } : current)
    } catch (error) { window.alert('Imeshindikana kuongeza SMS: ' + error.message) }
  }

  const addECardCredits = async () => {
    const amount = Number(eCardAmount)
    if (!selectedCustomer || !Number.isInteger(amount) || amount <= 0) {
      window.alert('Weka kiasi cha E-card credits kama namba kamili ya TSh.')
      return
    }
    setECardBusy(true)
    const { data, error } = await supabase.rpc('admin_adjust_e_card_balance', {
      p_user_id: selectedCustomer.id, p_amount: amount, p_description: eCardDescription.trim() || 'E-card top-up'
    })
    if (error) window.alert('Imeshindikana kuongeza E-card credit: ' + error.message)
    else {
      setECardAmount('')
      window.alert(`E-card credits zimeongezwa. Salio jipya: TSh ${Number(data).toLocaleString()}`)
      await loadCustomers()
      const updated = { ...selectedCustomer, e_card_balance: data }
      setSelectedCustomer(updated)
      await loadECardTransactions(updated)
    }
    setECardBusy(false)
  }

  if (loading) return <div className="card"><p>Inapakia akaunti za wateja...</p></div>

  if (selectedCustomer) return (
    <>
      <div className="page-header"><div><h1>Taarifa za Akaunti</h1><p>Usimamizi wa SMS na E-card kwa mteja huyu.</p></div></div>
      <div className="card">
        <h2>{selectedCustomer.full_name || 'Customer'}</h2>
        <p><strong>Email:</strong> {selectedCustomer.email || '-'}</p>
        <p><strong>Simu:</strong> {selectedCustomer.phone || '-'}</p>
        <p><strong>SMS balance:</strong> {selectedCustomer.sms_balance ?? 0} credits</p>
        <p><strong>E-card balance:</strong> TSh {Number(selectedCustomer.e_card_balance || 0).toLocaleString()}</p>
        <p><strong>E-cards:</strong> {selectedCustomer.e_cards_count || 0} · <strong>Mialiko:</strong> {selectedCustomer.e_card_invitations || 0} · <strong>Walioingia:</strong> {selectedCustomer.e_card_checked_in || 0}</p>
        <button className="primary-button" onClick={() => addCredits(selectedCustomer)}>Ongeza SMS credits</button>
      </div>
      <div className="card">
        <h2>Ongeza E-card credits</h2>
        <p>Salio hili ni tofauti kabisa na SMS. Kwa bei ya TSh 500 kwa mwaliko mmoja, TSh 5,000 ni mialiko 10.</p>
        <label>Kiasi cha kuongeza (TSh)</label>
        <input type="number" min="1" step="1" value={eCardAmount} onChange={e => setECardAmount(e.target.value)} placeholder="Mfano: 10000" />
        <label>Maelezo / kumbukumbu ya malipo</label>
        <input value={eCardDescription} onChange={e => setECardDescription(e.target.value)} />
        <button className="primary-button" disabled={eCardBusy || !eCardAmount} onClick={addECardCredits}>{eCardBusy ? 'Inaongeza...' : 'Ongeza E-card credits'}</button>
      </div>
      <div className="card">
        <h2>Historia ya E-card</h2>
        {eCardHistoryLoading ? <p>Inapakia...</p> : eCardTransactions.length === 0 ? <p>Bado hakuna miamala.</p> :
          <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Tarehe</th><th>Aina</th><th>Kiasi</th><th>Maelezo</th></tr></thead><tbody>
            {eCardTransactions.map(t => <tr key={t.id}><td>{new Date(t.created_at).toLocaleString()}</td><td>{t.transaction_type}</td><td>{t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}</td><td>{t.description}</td></tr>)}
          </tbody></table></div>}
      </div>
      <div className="card">
        <h2>SMS History</h2>
        {historyLoading && <p>Inapakia SMS history...</p>}
        {historyError && <p style={{color:'#b00020'}}>{historyError}</p>}
        {!historyLoading && smsHistory.length === 0 && <p>Hakuna SMS history kwa mteja huyu.</p>}
        {smsHistory.length > 0 && <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Tarehe</th><th>Mpokeaji</th><th>Ujumbe</th><th>SMS</th><th>Hali</th></tr></thead><tbody>
          {smsHistory.map(item => <tr key={item.id}><td>{item.sent_at ? new Date(item.sent_at).toLocaleString() : '-'}</td><td>{item.recipient}</td><td>{item.message}</td><td>{item.sms_count}</td><td>{item.status}</td></tr>)}
        </tbody></table></div>}
      </div>
      <button className="secondary-button" onClick={() => { setSelectedCustomer(null); setSmsHistory([]); setECardTransactions([]); setHistoryError('') }}>Rudi kwenye wateja</button>{' '}
      <button className="secondary-button" onClick={onBack}>Dashboard</button>
    </>
  )

  return <>
    <div className="page-header"><div><h1>Akaunti za Wateja</h1><p>Muhtasari wa salio na matumizi ya kila akaunti.</p></div><button className="secondary-button" onClick={loadCustomers}>Refresh</button></div>
    {errorMessage && <div className="card"><p>{errorMessage}</p></div>}
    <div className="card" style={{overflowX:'auto'}}>
      <table style={{width:'100%',minWidth:'760px',borderCollapse:'collapse'}}><thead><tr>
        <th>Jina</th><th>Email</th><th>Simu</th><th>SMS credits</th><th>E-card TSh</th><th>Mialiko</th><th>Check-in</th><th>Kitendo</th>
      </tr></thead><tbody>
        {customers.map(customer => <tr key={customer.id}>
          <td><button type="button" onClick={() => openCustomerDetails(customer)} style={{border:0,background:'transparent',color:'#8a6d1d',fontWeight:700,cursor:'pointer'}}>{customer.full_name || 'Customer'}</button></td>
          <td>{customer.email || '-'}</td><td>{customer.phone || '-'}</td><td>{customer.sms_balance ?? 0}</td>
          <td>{Number(customer.e_card_balance || 0).toLocaleString()}</td><td>{customer.e_card_invitations || 0}</td><td>{customer.e_card_checked_in || 0}</td>
          <td><button className="primary-button" onClick={() => openCustomerDetails(customer)}>Angalia akaunti</button></td>
        </tr>)}
      </tbody></table>
      {customers.length === 0 && <p>Hakuna wateja waliopatikana.</p>}
    </div>
  </>
}


function AdminECardTemplates({ onBack, session }) {
  const [templates, setTemplates] = useState([])
  const [name, setName] = useState('')
  const [occasion, setOccasion] = useState('Harusi')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase.from('e_card_templates').select('*').order('created_at', { ascending: false })
    if (loadError) setError('Imeshindikana kupakia sampuli: ' + loadError.message)
    else { setTemplates(data || []); setError('') }
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  const upload = async e => {
    e.preventDefault(); setNotice(''); setError('')
    if (!name.trim() || !file) { setError('Weka jina la sampuli na uchague picha.'); return }
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Tumia picha JPG, PNG au WEBP isiyozidi 5MB.'); return
    }
    if (!window.crypto?.randomUUID) { setError('Tafadhali tumia kivinjari kilichosasishwa.'); return }
    setBusy(true)
    try {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = 'templates/' + window.crypto.randomUUID() + '.' + ext
      const { error: uploadError } = await supabase.storage.from('e-card-templates').upload(path, file, { upsert: false, contentType: file.type })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('e-card-templates').getPublicUrl(path)
      const { error: insertError } = await supabase.from('e_card_templates').insert({
        name: name.trim(), occasion, description: description.trim(), image_url: urlData.publicUrl,
        theme: 'gold', design: { template: 'classic' }, is_active: true, created_by: session.user.id
      })
      if (insertError) throw insertError
      setName(''); setDescription(''); setFile(null)
      const picker = document.getElementById('ecard-template-file'); if (picker) picker.value = ''
      setNotice('Sampuli imeongezwa na sasa inaonekana kwa wateja.')
      await load()
    } catch (err) { setError('Sampuli haijaongezwa: ' + err.message) }
    finally { setBusy(false) }
  }
  const toggle = async item => {
    setError(''); setNotice('')
    const { error: updateError } = await supabase.from('e_card_templates').update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq('id', item.id)
    if (updateError) setError('Imeshindikana kubadili hali: ' + updateError.message)
    else { setNotice('Hali ya sampuli imebadilishwa.'); await load() }
  }
  const remove = async item => {
    if (!window.confirm('Una uhakika unataka kufuta sampuli hii?')) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('e_card_templates').delete().eq('id', item.id)
    if (deleteError) setError('Imeshindikana kufuta sampuli: ' + deleteError.message)
    else { setNotice('Sampuli imefutwa.'); await load() }
    setBusy(false)
  }
  return <>
    <div className="page-header"><div><h1>Sampuli za E-card</h1><p>Pakia miundo rasmi ambayo wateja watachagua wanapotengeneza mialiko.</p></div><button className="secondary-button" onClick={load}>Refresh</button></div>
    <div className="card">
      <h2>Ongeza sampuli mpya</h2>
      <form onSubmit={upload}>
        <label>Jina la muundo</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Mfano: Royal Wedding Gold" required />
        <label>Aina ya tukio</label><select value={occasion} onChange={e => setOccasion(e.target.value)}><option>Harusi</option><option>Send-off</option><option>Kipaimara</option><option>Graduation</option><option>Birthday</option><option>Kitchen Party</option><option>Shukrani</option><option>Kupongeza</option><option>Kumuaga</option><option>Tukio lingine</option></select>
        <label>Maelezo mafupi</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Maelezo ya muundo huu" />
        <label>Picha ya sampuli (JPG, PNG au WEBP; hadi 5MB)</label><input id="ecard-template-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} required />
        {file && <p>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
        <button className="primary-button" type="submit" disabled={busy}>{busy ? 'Inapakia...' : 'Pakia sampuli'}</button>
      </form>
    </div>
    {notice && <div className="card"><p>{notice}</p></div>}
    {error && <div className="card"><p style={{color:'#b00020'}}>{error}</p></div>}
    <div className="card"><h2>Miundo iliyopo</h2>
      {loading ? <p>Inapakia...</p> : templates.length === 0 ? <p>Bado hujaongeza sampuli.</p> :
        <div className="ecard-template-gallery">{templates.map(item => <div className="ecard-template-option" key={item.id}>
          <img src={item.image_url} alt={item.name} style={{width:'100%',height:'190px',objectFit:'cover',borderRadius:'8px'}} />
          <b>{item.name}</b><small>{item.occasion} · {item.description}</small>
          <em>{item.is_active ? 'Inaonekana kwa wateja' : 'Imefichwa kwa wateja'}</em>
          <button type="button" className="secondary-button" onClick={() => toggle(item)}>{item.is_active ? 'Ficha sampuli' : 'Onyesha sampuli'}</button>
          <button type="button" className="secondary-button" disabled={busy} onClick={() => remove(item)}>Futa sampuli</button>
        </div>)}</div>}
    </div>
    <button className="secondary-button" onClick={onBack}>Rudi Dashboard</button>
  </>
}

function AdminECardManagement({ onBack }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('Malipo ya E-card yaliyopokelewa')
  const [busy, setBusy] = useState(false)
  const loadAccounts = async () => {
    setLoading(true); setError('')
    const { data, error: rpcError } = await supabase.rpc('admin_get_e_card_accounts')
    if (rpcError) setError('Imeshindikana kupakia taarifa za E-card: ' + rpcError.message)
    else setAccounts(data || [])
    setLoading(false)
  }
  const loadTransactions = async account => {
    setSelected(account); setTransactions([]); setError('')
    const { data, error: rpcError } = await supabase.rpc('admin_get_e_card_transactions', { p_user_id: account.user_id })
    if (rpcError) setError('Historia haikupatikana: ' + rpcError.message)
    else setTransactions(data || [])
  }
  useEffect(() => { loadAccounts() }, [])
  const addCredits = async () => {
    const value = Number(amount)
    if (!selected || !Number.isInteger(value) || value <= 0) return window.alert('Weka kiasi sahihi cha E-card credits kwa TSh.')
    setBusy(true)
    const { data, error: rpcError } = await supabase.rpc('admin_adjust_e_card_balance', {
      p_user_id: selected.user_id, p_amount: value, p_description: description.trim() || 'E-card top-up'
    })
    if (rpcError) window.alert('Imeshindikana kuongeza credits: ' + rpcError.message)
    else {
      window.alert('E-card credits zimeongezwa. Salio jipya: TSh ' + Number(data).toLocaleString())
      setAmount('')
      await loadAccounts()
      const updated = { ...selected, e_card_balance: data }
      setSelected(updated)
      const result = await supabase.rpc('admin_get_e_card_transactions', { p_user_id: updated.user_id })
      if (!result.error) setTransactions(result.data || [])
    }
    setBusy(false)
  }
  if (loading) return <div className="card"><p>Inapakia akaunti za E-card...</p></div>
  return <>
    <div className="page-header"><div><h1>Usimamizi wa E-card</h1><p>Angalia salio, mialiko na ongeza credits za E-card kwa wateja.</p></div><button className="secondary-button" onClick={loadAccounts}>Refresh</button></div>
    {error && <div className="card"><p style={{color:'#b00020'}}>{error}</p></div>}
    <div className="card" style={{overflowX:'auto'}}>
      <h2>Akaunti za E-card</h2>
      <table style={{width:'100%',minWidth:'680px',borderCollapse:'collapse'}}>
        <thead><tr><th>Mteja</th><th>Salio (TSh)</th><th>E-cards</th><th>Mialiko</th><th>Check-in</th><th>Kitendo</th></tr></thead>
        <tbody>{accounts.map(account => <tr key={account.user_id}>
          <td>{account.full_name || account.email || 'Customer'}<br/><small>{account.email || ''}</small></td>
          <td>{Number(account.e_card_balance || 0).toLocaleString()}</td><td>{account.cards_count || 0}</td><td>{account.invitations_count || 0}</td><td>{account.checked_in_count || 0}</td>
          <td><button className="primary-button" onClick={() => loadTransactions(account)}>Simamia E-card</button></td>
        </tr>)}</tbody>
      </table>
      {accounts.length === 0 && <p>Hakuna akaunti za E-card zilizopatikana.</p>}
    </div>
    {selected && <div className="card">
      <h2>Ongeza credits: {selected.full_name || selected.email || 'Customer'}</h2>
      <p>Salio la sasa: <strong>TSh {Number(selected.e_card_balance || 0).toLocaleString()}</strong></p>
      <label>Kiasi cha kuongeza (TSh)</label><input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Mfano: 10000" />
      <label>Maelezo / kumbukumbu ya malipo</label><input value={description} onChange={e => setDescription(e.target.value)} />
      <button className="primary-button" disabled={busy || !amount} onClick={addCredits}>{busy ? 'Inaongeza...' : 'Ongeza E-card credits'}</button>
      <h3>Historia ya E-card</h3>
      {transactions.length === 0 ? <p>Bado hakuna miamala.</p> : <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th>Tarehe</th><th>Aina</th><th>Kiasi</th><th>Maelezo</th></tr></thead><tbody>{transactions.map(t => <tr key={t.id}><td>{new Date(t.created_at).toLocaleString()}</td><td>{t.transaction_type}</td><td>{t.amount > 0 ? '+' : ''}{Number(t.amount).toLocaleString()}</td><td>{t.description}</td></tr>)}</tbody></table></div>}
    </div>}
    <button className="secondary-button" onClick={onBack}>Rudi Dashboard</button>
  </>
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

  // E-CARD STATES
  const [eCards, setECards] = useState([])
  const [eCardsLoading, setECardsLoading] = useState(false)
  const [ecardTemplates, setEcardTemplates] = useState([])
  const [ecardTemplatesLoading, setEcardTemplatesLoading] = useState(false)
  const [eCardWalletBalance, setECardWalletBalance] = useState(0)
  const [eCardWalletLoading, setECardWalletLoading] = useState(false)
  const [eCardSaving, setECardSaving] = useState(false)
  const [eCardMessage, setECardMessage] = useState('')
  const [editingECardId, setEditingECardId] = useState(null)
  const [publicECard, setPublicECard] = useState(null)
  const [publicECardLoading, setPublicECardLoading] = useState(false)
  const [guestCardId, setGuestCardId] = useState('')
  const [eCardGuests, setECardGuests] = useState([])
  const [guestName, setGuestName] = useState('')
  const [guestType, setGuestType] = useState('single')
  const [guestBusy, setGuestBusy] = useState(false)
  const [scanToken, setScanToken] = useState('')
  const [scanResult, setScanResult] = useState('')
  const [scannerActive, setScannerActive] = useState(false)
  const scanVideoRef = useRef(null)
  const defaultECardDesign = { template:'classic', background:'#fffdf8', accent:'#9a792d', text:'#332b20', font:'Georgia, serif', alignment:'center', titleSize:'32px' }
  const [eCardDesign, setECardDesign] = useState(defaultECardDesign)
  const [eCardForm, setECardForm] = useState({
    title: '', occasion: 'Harusi', host_names: '', bride_name: '', groom_name: '', event_date: '',
    event_time: '', venue: '', ceremony_time: '', ceremony_venue: '', reception_time: '', reception_venue: '',
    food_note: '', dress_code: '', dress_colors: [], rsvp_deadline: '', rsvp_contact_name: '',
    rsvp_contact_phone: '', rsvp_contact_name_2: '', rsvp_contact_phone_2: '',
    location_url: '', message: DEFAULT_ECARD_MESSAGE, image_url: '', theme: 'gold'
  })

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
  const [editingEventId, setEditingEventId] = useState(null)

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
   const [smsContactGroups, setSmsContactGroups] = useState([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('')
  const [contactGroupName, setContactGroupName] = useState('Contacts Zangu');
  const [activeSmsContactGroup, setActiveSmsContactGroup] = useState('Contacts Zangu');
  const [editingContactId, setEditingContactId] = useState(null);
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


  useEffect(() => {
    if (page !== 'ecard') return
    let active = true
    const loadTemplates = async () => {
      setEcardTemplatesLoading(true)
      const { data, error } = await supabase.from('e_card_templates').select('id,name,occasion,description,image_url,theme,design').eq('is_active', true).order('created_at', { ascending: false })
      if (!active) return
      if (error) setECardMessage('Sampuli za E-card hazijapakiwa: ' + error.message)
      else setEcardTemplates(data || [])
      setEcardTemplatesLoading(false)
    }
    loadTemplates()
    return () => { active = false }
  }, [page])

  // =========================
  // E-CARD FUNCTIONS
  // =========================
  const loadECards = async () => {
    if (!session?.user?.id) return
    setECardsLoading(true)
    const { data, error } = await supabase
      .from('e_cards')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    if (error) {
      setECardMessage('Imeshindikana kupakia E-card: ' + error.message)
      setECards([])
    } else {
      setECards(data || [])
      setECardMessage('')
    }
    setECardsLoading(false)
  }

  const resetECardForm = () => {
    setEditingECardId(null)
    setECardForm({
      title: '', occasion: 'Harusi', host_names: '', bride_name: '', groom_name: '', event_date: '',
      event_time: '', venue: '', ceremony_time: '', ceremony_venue: '', reception_time: '', reception_venue: '',
      food_note: '', dress_code: '', dress_colors: [], rsvp_deadline: '', rsvp_contact_name: '',
      rsvp_contact_phone: '', rsvp_contact_name_2: '', rsvp_contact_phone_2: '',
      location_url: '', message: DEFAULT_ECARD_MESSAGE, image_url: '', theme: 'gold'
    })
    setECardDesign(defaultECardDesign)
  }

  const saveECard = async (e) => {
    e.preventDefault()
    setECardMessage('')
    if (!eCardForm.title.trim() || !eCardForm.event_date) {
      setECardMessage('Jaza jina la tukio na tarehe.')
      return
    }
    if (eCardForm.image_url && !/^https:\/\//i.test(eCardForm.image_url)) {
      setECardMessage('Picha lazima iwe na link salama inayoanza na https://')
      return
    }
    setECardSaving(true)
    try {
      const payload = {
        ...eCardForm,
        design: defaultECardDesign,
        event_time: eCardForm.event_time || null,
        title: eCardForm.title.trim(),
        host_names: eCardForm.host_names.trim(),
        venue: eCardForm.venue.trim(),
        ceremony_time: eCardForm.ceremony_time || null,
        reception_time: eCardForm.reception_time || null,
        rsvp_deadline: eCardForm.rsvp_deadline || null,
        location_url: eCardForm.location_url.trim() || null,
        message: eCardForm.message.trim() || DEFAULT_ECARD_MESSAGE,
        image_url: eCardForm.image_url.trim() || null,
        user_id: session.user.id
      }
      const query = editingECardId
        ? supabase.from('e_cards').update(payload).eq('id', editingECardId).eq('user_id', session.user.id).select().single()
        : supabase.from('e_cards').insert(payload).select().single()
      const { data, error } = await query
      if (error) throw error
      setECardMessage('E-card imehifadhiwa. Unaweza kushiriki link yake na wageni.')
      resetECardForm()
      await loadECards()
    } catch (error) {
      setECardMessage('E-card haijahifadhiwa: ' + error.message)
    } finally {
      setECardSaving(false)
    }
  }

  const editECard = (card) => {
    setEditingECardId(card.id)
    setECardForm({
      title: card.title || '', occasion: card.occasion || 'Harusi',
      host_names: card.host_names || '', bride_name: card.bride_name || '', groom_name: card.groom_name || '',
      event_date: card.event_date || '', event_time: card.event_time || '', venue: card.venue || '',
      ceremony_time: card.ceremony_time || '', ceremony_venue: card.ceremony_venue || '',
      reception_time: card.reception_time || '', reception_venue: card.reception_venue || '',
      food_note: card.food_note || '', dress_code: card.dress_code || '', dress_colors: card.dress_colors || [],
      rsvp_deadline: card.rsvp_deadline || '', rsvp_contact_name: card.rsvp_contact_name || '',
      rsvp_contact_phone: card.rsvp_contact_phone || '', rsvp_contact_name_2: card.rsvp_contact_name_2 || '',
      rsvp_contact_phone_2: card.rsvp_contact_phone_2 || '', location_url: card.location_url || '',
      message: card.message || DEFAULT_ECARD_MESSAGE, image_url: card.image_url || '', theme: card.theme || 'gold'
    })
    setECardDesign(defaultECardDesign)
    setECardMessage('Badilisha taarifa za kadi kisha hifadhi.')
    setPage('ecard')
  }

  const toggleECardPublished = async (card) => {
    const { error } = await supabase.from('e_cards')
      .update({ is_published: !card.is_published })
      .eq('id', card.id).eq('user_id', session.user.id)
    if (error) {
      setECardMessage('Imeshindikana kubadilisha hali ya kadi: ' + error.message)
      return
    }
    await loadECards()
  }

  const loadECardWallet = async () => {
    if (!session?.user?.id) return
    setECardWalletLoading(true)
    const { data, error } = await supabase.from('e_card_wallets').select('balance').eq('user_id', session.user.id).maybeSingle()
    if (!error) setECardWalletBalance(data?.balance || 0)
    setECardWalletLoading(false)
  }

  const loadECardGuests = async (cardId) => {
    if (!cardId) { setECardGuests([]); return }
    const { data, error } = await supabase.from('e_card_guests').select('*')
      .eq('card_id', cardId).order('created_at', { ascending: false })
    if (error) { setECardMessage('Imeshindikana kupakia wageni: ' + error.message); return }
    setECardGuests(data || [])
  }

  const addECardGuest = async (e) => {
    e.preventDefault()
    if (!guestCardId || !guestName.trim()) return
    setGuestBusy(true); setScanResult('')
    const { error } = await supabase.rpc('create_paid_e_card_guest', {
      p_card_id: guestCardId, p_guest_name: guestName.trim(), p_invite_type: guestType
    })
    if (error) setECardMessage('Mgeni hakuongezwa: ' + error.message)
    else { setGuestName(''); setECardMessage('Mwaliko umetengenezwa. TSh 500 zimekatwa kwenye salio lako.'); await loadECardGuests(guestCardId); await loadECardWallet() }
    setGuestBusy(false)
  }

  const checkInECardGuest = async (rawToken) => {
    const token = String(rawToken || '').trim()
    if (!token) { setScanResult('Weka au scan QR token kwanza.'); return }
    const { data, error } = await supabase.rpc('check_in_e_card_guest', { p_token: token })
    if (error) { setScanResult(error.message || 'QR haijatambulika.'); return }
    const guest = Array.isArray(data) ? data[0] : data
    if (!guest) { setScanResult('QR haijatambulika.'); return }
    setScanToken('')
    setScanResult('IMEKUBALIWA: ' + guest.guest_name + ' — ' + guest.invite_type.toUpperCase() + ' (' + guest.guest_count + ' watu).')
    await loadECardGuests(guestCardId)
  }

  const startECardScanner = async () => {
    try {
      setScanResult('')
      setScannerActive(true)
      await new Promise(resolve => requestAnimationFrame(resolve))
      const scanner = new Html5Qrcode('ecard-qr-reader')
      scanVideoRef.current = scanner
      let handled = false
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        async decodedText => {
          if (handled) return
          handled = true
          setScannerActive(false)
          try { await scanner.stop() } catch {}
          try { await scanner.clear() } catch {}
          scanVideoRef.current = null
          let token = decodedText.trim()
          try {
            const parsed = new URL(token)
            token = parsed.searchParams.get('guest') || token
          } catch {
            const found = token.match(/[?&]guest=([a-f0-9-]+)/i)
            if (found) token = found[1]
          }
          await checkInECardGuest(token)
        },
        () => {}
      )
    } catch (error) {
      setScannerActive(false)
      if (scanVideoRef.current) {
        try { await scanVideoRef.current.stop() } catch {}
        try { await scanVideoRef.current.clear() } catch {}
        scanVideoRef.current = null
      }
      setScanResult('Imeshindikana kuwasha kamera. Ruhusu camera kwenye browser na hakikisha unatumia HTTPS. Maelezo: ' + error.message)
    }
  }

  const stopECardScanner = async () => {
    const scanner = scanVideoRef.current
    if (scanner) {
      try { await scanner.stop() } catch {}
      try { await scanner.clear() } catch {}
      scanVideoRef.current = null
    }
    setScannerActive(false)
  }

  const deleteECard = async (card) => {
    if (!window.confirm('Una uhakika unataka kufuta E-card hii?')) return
    const { error } = await supabase.from('e_cards')
      .delete().eq('id', card.id).eq('user_id', session.user.id)
    if (error) {
      setECardMessage('Imeshindikana kufuta E-card: ' + error.message)
      return
    }
    await loadECards()
  }

  useEffect(() => {
    if (session?.user?.id && profile?.role !== 'admin') { loadECards(); loadECardWallet() }
  }, [session?.user?.id, profile?.role])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slug = params.get('card')
    const guestToken = params.get('guest')
    if (!slug) return
    let active = true
    const loadPublicCard = async () => {
      setPublicECardLoading(true)
      const { data, error } = await supabase.from('e_cards')
        .select('id, title, occasion, host_names, bride_name, groom_name, event_date, event_time, venue, ceremony_time, ceremony_venue, reception_time, reception_venue, food_note, dress_code, dress_colors, rsvp_deadline, rsvp_contact_name, rsvp_contact_phone, rsvp_contact_name_2, rsvp_contact_phone_2, location_url, message, image_url, theme, design')
        .eq('slug', slug).eq('is_published', true).maybeSingle()
      let guest = null
      if (!error && data && guestToken) {
        const result = await supabase.from('e_card_guests')
          .select('guest_name, invite_type, guest_count, token')
          .eq('token', guestToken).eq('card_id', data.id).maybeSingle()
        guest = result.error ? null : result.data
      }
      if (active) {
        setPublicECard(error ? null : (data ? {...data, guest} : null))
        setPublicECardLoading(false)
      }
    }
    loadPublicCard()
    return () => { active = false }
  }, [])

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
        message +
        ' Ahadi yako ni TZS ' + pledged.toLocaleString() +
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
  const editEvent = (event) => {
    setEditingEventId(event.id)
    setEventName(event.event_name || '')
    setEventType(event.event_type || '')
    setEventDescription(event.description || '')
    setEventDate(event.event_date || '')
    setEventTime(event.event_time || '')
    setVenue(event.venue || '')
    setEventMessage('Badilisha taarifa za event kisha hifadhi.')
    setPage('create')
  }

  const createEvent = async (e) => {
    e.preventDefault()
    setEventMessage('')

    if (!eventName || !eventDate) {
      setEventMessage(
        'Tafadhali jaza jina la event na tarehe.'
      )
      return
    }

    const eventPayload = { event_name: eventName.trim(), event_type: eventType, description: eventDescription, event_date: eventDate, event_time: eventTime || null, venue }
    const query = editingEventId
      ? supabase.from('events').update(eventPayload).eq('id', editingEventId).eq('user_id', session.user.id)
      : supabase.from('events').insert({ ...eventPayload, user_id: session.user.id })
    const { error } = await query

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
    setEditingEventId(null)

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
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const contactsResponse = await fetch('https://forteevents.onrender.com/api/sms/contacts', { headers });
      const contactsData = await contactsResponse.json();
      if (!contactsResponse.ok) throw new Error(contactsData.message || 'Imeshindikana kupata contacts.');
      const savedContacts = contactsData.contacts || [];
      setSmsContacts(savedContacts);

      // Keep existing contacts visible even if the groups migration has not run yet.
      const groupsResponse = await fetch('https://forteevents.onrender.com/api/sms/contact-groups', { headers });
      let savedGroups = [];
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json();
        savedGroups = groupsData.groups || [];
      } else {
        savedGroups = [...new Set(['Contacts Zangu', ...savedContacts.map((contact) => contact.group_name || 'Contacts Zangu')])]
          .map((name) => ({ name }));
        setContactsStatus('Contacts zimepakiwa. Endesha migration ya makundi ili makundi matupu yahifadhiwe pia.');
      }
      setSmsContactGroups(savedGroups);
      const names = savedGroups.map((group) => group.name);
      if (names.length && !names.includes(activeSmsContactGroup)) {
        setActiveSmsContactGroup(names.includes('Contacts Zangu') ? 'Contacts Zangu' : names[0]);
        setContactGroupName(names.includes('Contacts Zangu') ? 'Contacts Zangu' : names[0]);
      }
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kupakia contacts na makundi.');
    } finally {
      setContactsLoading(false);
    }
  };

  const createSmsContactGroup = async () => {
    const name = contactGroupName.trim();
    if (!name) {
      setContactsStatus('Andika jina la kundi kwanza.');
      return;
    }
    setContactsSaving(true);
    setContactsStatus('');
    try {
      const response = await fetch('https://forteevents.onrender.com/api/sms/contact-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Imeshindikana kuhifadhi kundi.');
      setSmsContactGroups(data.groups || []);
      setActiveSmsContactGroup(name);
      setContactGroupName(name);
      setSelectedContactIds([]);
      setEditingContactId(null);
      setContactName('');
      setContactPhone('');
      setContactsStatus('Kundi jipya limehifadhiwa. Sasa unaweza kuongeza contacts.');
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kuhifadhi kundi.');
    } finally {
      setContactsSaving(false);
    }
  };

  const renameSmsContactGroup = async () => {
    const oldName = activeSmsContactGroup || 'Contacts Zangu';
    const newName = window.prompt('Andika jina jipya la kundi:', oldName);
    if (newName === null) return;
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === oldName) return;
    setContactsSaving(true);
    setContactsStatus('');
    try {
      const response = await fetch('https://forteevents.onrender.com/api/sms/contact-groups/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ old_name: oldName, new_name: trimmedName }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Imeshindikana kubadilisha jina.');
      setSmsContacts((previous) => previous.map((contact) =>
        (contact.group_name || 'Contacts Zangu') === oldName
          ? { ...contact, group_name: trimmedName } : contact
      ));
      setActiveSmsContactGroup(trimmedName);
      setContactGroupName(trimmedName);
      await loadSmsContacts();
      setContactsStatus('Jina limebadilishwa. Contacts zote zimebaki kwenye kundi hilo.');
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kubadilisha jina la kundi.');
    } finally {
      setContactsSaving(false);
    }
  };

  const deleteSmsContactGroup = async () => {
    const name = activeSmsContactGroup;
    const count = smsContacts.filter((contact) => (contact.group_name || 'Contacts Zangu') === name).length;
    if (count > 0) {
      setContactsStatus('Kundi lina contacts. Hamisha au futa contacts zake kwanza; mfumo hautafuta contacts zako kwa bahati mbaya.');
      return;
    }
    if (!window.confirm(`Una uhakika unataka kufuta kundi "${name}"?`)) return;
    setContactsSaving(true);
    try {
      const response = await fetch('https://forteevents.onrender.com/api/sms/contact-groups', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || 'Imeshindikana kufuta kundi.');
      setSmsContactGroups(data.groups || []);
      const nextName = (data.groups || []).some((group) => group.name === 'Contacts Zangu')
        ? 'Contacts Zangu' : (data.groups || [])[0]?.name || 'Contacts Zangu';
      setActiveSmsContactGroup(nextName);
      setContactGroupName(nextName);
      setContactsStatus('Kundi limefutwa. Contacts hazijaguswa.');
    } catch (error) {
      setContactsStatus(error.message || 'Imeshindikana kufuta kundi.');
    } finally {
      setContactsSaving(false);
    }
  };

  const editSmsContact = (contact) => {
    setEditingContactId(contact.id)
    setContactName(contact.name || '')
    setContactPhone(contact.phone || '')
    setContactGroupName(contact.group_name || 'Contacts Zangu')
    setActiveSmsContactGroup(contact.group_name || 'Contacts Zangu')
    setContactsStatus('Badilisha taarifa za contact kisha hifadhi.')
  }

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
        editingContactId
          ? `https://forteevents.onrender.com/api/sms/contacts/${editingContactId}`
          : 'https://forteevents.onrender.com/api/sms/contacts',
        {
          method: editingContactId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: contactName.trim(),
            phone: contactPhone.trim(),
            group_name: (contactGroupName || activeSmsContactGroup || 'Contacts Zangu').trim(),
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

      const savedContacts = Array.isArray(data.contacts) ? data.contacts : (data.contact ? [data.contact] : []);
      const savedGroupName = (contactGroupName || activeSmsContactGroup || 'Contacts Zangu').trim();
      const savedContact = savedContacts.find(
        (item) => editingContactId
          ? String(item.id) === String(editingContactId)
          : String(item.phone || '').trim() === contactPhone.trim() &&
            (item.group_name || 'Contacts Zangu') === savedGroupName
      );

      if (!savedContact) {
        throw new Error('Seva haijathibitisha kuhifadhi contact. Taarifa zako hazijafutwa; jaribu tena baada ya kukagua muunganisho.');
      }

      setSmsContacts((previous) => {
        const withoutDuplicate = previous.filter(
          (item) => String(item.id) !== String(savedContact.id) &&
            !(String(item.phone || '').trim() === String(savedContact.phone || '').trim() &&
              (item.group_name || 'Contacts Zangu') === (savedContact.group_name || 'Contacts Zangu'))
        );
        return [...withoutDuplicate, savedContact].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        );
      });
      const finalSavedGroupName = savedContact.group_name || contactGroupName || 'Contacts Zangu';
      setActiveSmsContactGroup(finalSavedGroupName);
      setContactGroupName(finalSavedGroupName);
      setContactName('');
      setContactPhone('');
      setEditingContactId(null);
      setContactsStatus(editingContactId ? 'Contact imebadilishwa vizuri.' : 'Contact imehifadhiwa vizuri.');
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
      (contact.group_name || 'Contacts Zangu') === activeSmsContactGroup &&
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


  if (new URLSearchParams(window.location.search).has('card')) {
    return (
      <div className="app-shell" style={{ minHeight: '100vh', padding: '24px', background: '#f8f5ed' }}>
        <div className="card" style={{ maxWidth: '680px', width: '100%', margin: '30px auto', padding: '28px', textAlign: 'center', border: '1px solid #d6bd78', background: '#fffdf8' }}>
          {publicECardLoading ? <p>Inafungua mwaliko...</p> : !publicECard ? (
            <><h2>ForteEvents</h2><p>Mwaliko huu haupatikani au bado haujachapishwa.</p></>
          ) : (
            <>
              {(() => { const d=defaultECardDesign; return <div className={`ecard-live-preview ecard-card-art ecard-card-${d.template}`}>
                <div className="ecard-card-inner">
                  <div className="ecard-card-brand"><img src="/forteevents-logo.png" alt="ForteEvents" /></div>
                  <ECardFloralOrnament className="ecard-public-floral-top" />
                  <p className="ecard-card-kicker">{publicECard.occasion || 'MWALIKO'}</p><h2>{publicECard.title}</h2>
                  <div className="ecard-card-divider"><span>✦</span></div>
                  {publicECard.image_url && <img className="ecard-card-photo" src={publicECard.image_url} alt="Picha ya tukio"/>}
                  <p className="ecard-card-invite">Familia ya {publicECard.host_names || 'familia zetu'}</p>
                  <ECardInvitationCopy card={publicECard} recipientName={publicECard.guest?.guest_name || '[JINA LA MWALIKWA]'} />
                  <ECardDetails card={publicECard} className="ecard-public-details" />
                  <ECardFamilyMessage message={publicECard.message} />
                  {publicECard.guest && <><p style={{fontWeight:700,fontSize:'22px'}}>Mgeni: {publicECard.guest.guest_name}</p><p>{publicECard.guest.invite_type.toUpperCase()} — {publicECard.guest.guest_count} {publicECard.guest.guest_count===1?'mtu':'watu'}</p><div className="ecard-public-qr-wrap"><GuestQr value={window.location.origin + window.location.pathname + '?card=' + encodeURIComponent(new URLSearchParams(window.location.search).get('card')) + '&guest=' + encodeURIComponent(publicECard.guest.token)} style={{display:'block',width:'190px',height:'190px'}} /></div></>}
                  
                  {publicECard.location_url && <section className="ecard-map-link-section"><div className="ecard-map-link-heading">RAMANI YA UKUMBI</div><a className="ecard-map-link-url" href={publicECard.location_url} target="_blank" rel="noopener noreferrer">{publicECard.location_url}</a><a className="ecard-map-open-link" href={publicECard.location_url} target="_blank" rel="noopener noreferrer">Fungua ramani moja kwa moja <span aria-hidden="true">↗</span></a></section>}
                  <div className="ecard-card-footer">Imetengenezwa kwa upendo na ForteEvents</div>
                  <ECardFloralOrnament className="ecard-public-floral-bottom" />
                </div>
              </div> })()}
            </>
          )}
        </div>
      </div>
    )
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
            <button className={adminPage === 'ecards' ? 'nav-button active' : 'nav-button'} onClick={() => setAdminPage('ecards')}>
              E-card Management
            </button>
            <button className={adminPage === 'ecard-templates' ? 'nav-button active' : 'nav-button'} onClick={() => setAdminPage('ecard-templates')}>E-card Templates</button>
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
                  <h3>E-card Management</h3>
                  <p>Simamia salio la E-card, mialiko, check-in na kuongeza credits za wateja sehemu moja.</p>
                  <button className="primary-button" onClick={() => setAdminPage('ecards')}>Manage E-cards</button>
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
{adminPage === 'ecards' && <AdminECardManagement onBack={() => setAdminPage('dashboard')} />}
{adminPage === 'ecard-templates' && <AdminECardTemplates session={session} onBack={() => setAdminPage('dashboard')} />}
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
          onClick={() => { setEditingEventId(null); setEventName(''); setEventType(''); setEventDescription(''); setEventDate(''); setEventTime(''); setVenue(''); setPage('create') }}
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
          className={page === 'ecard' ? 'nav-button active' : 'nav-button'}
          onClick={() => { resetECardForm(); setPage('ecard') }}
        >
          E-card
        </button>

        <button className={page === 'ecard-checkin' ? 'nav-button active' : 'nav-button'} onClick={() => setPage('ecard-checkin')}>QR Check-in</button>

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
              <h1>{editingEventId ? 'Edit Event' : 'Create Event'}</h1>

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
                {editingEventId ? 'Update Event' : 'Save Event'}
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

                  <button type="button" className="primary-button" onClick={() => editEvent(event)} style={{ marginRight: '8px' }}>Edit Event</button>
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

            <label>Andika au hariri ujumbe wa SMS</label>
            <textarea
              value={contributionSmsMessage}
              onChange={(e) => setContributionSmsMessage(e.target.value)}
              rows={4}
              placeholder="Andika ujumbe wa SMS"
            />
            <p>
              Unaweza kutumia {'{jina}'} na {'{event}'} kwa aina zote.
              Kwa ujumbe binafsi, mfumo utaongeza moja kwa moja ahadi,
              kiasi alicholipa na salio la kila mchangiaji.
            </p>
            {(() => {
              const sample = contributors.find((item) => item.phone?.trim()) || contributors[0]
              if (!sample) return <p>Hakuna mchangiaji wa kuonyesha mfano wa ujumbe.</p>
              const pledged = Number(sample.pledged_amount || 0)
              const paid = Number(sample.paid_amount || 0)
              const balance = Math.max(0, pledged - paid)
              let preview = contributionSmsMessage
                .replaceAll('{jina}', sample.full_name || '')
                .replaceAll('{ahadi}', pledged.toLocaleString())
                .replaceAll('{amelipa}', paid.toLocaleString())
                .replaceAll('{salio}', balance.toLocaleString())
                .replaceAll('{event}', contributionEvent?.event_name || '')
              if (contributionSmsMode === 'personal') {
                preview += ' Ahadi yako ni TZS ' + pledged.toLocaleString() +
                  ', umelipa TZS ' + paid.toLocaleString() +
                  ', salio TZS ' + balance.toLocaleString() +
                  '. Asante kwa mchango wako.'
              }
              return (
                <div style={{ background: '#fffdf7', border: '1px solid #d6c18a', borderRadius: '8px', padding: '12px', marginTop: '10px' }}>
                  <strong>Muonekano wa SMS kwa {sample.full_name}:</strong>
                  <p style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{preview}</p>
                </div>
              )
            })()}

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
          E-CARD
      ========================= */}
      {page === 'ecard-checkin' && (
        <div className="card">
          <h1>Mapokezi ya Wageni — QR Check-in</h1>
          <p>Chagua tukio, kisha msimamizi ascan QR ya kila mgeni.</p>
          <label>Chagua kadi / tukio</label>
          <select value={guestCardId} onChange={e => { setGuestCardId(e.target.value); loadECardGuests(e.target.value); setScanResult('') }}>
            <option value="">Chagua E-card</option>
            {eCards.map(card => <option key={card.id} value={card.id}>{card.title}</option>)}
          </select>
          <button type="button" className="primary-button" onClick={startECardScanner} disabled={!guestCardId || scannerActive}>{scannerActive ? 'Scanner inafanya kazi...' : 'Washa kamera kuscan QR'}</button>
          {scannerActive && <button type="button" className="secondary-button" onClick={stopECardScanner}>Zima kamera</button>}
          <div id="ecard-qr-reader" style={{width:'100%',maxWidth:'420px',marginTop:'12px',display:scannerActive?'block':'none'}} />
          <label>Au ingiza QR token manually</label>
          <input value={scanToken} onChange={e => setScanToken(e.target.value)} placeholder="QR token" />
          <button type="button" className="secondary-button" onClick={() => checkInECardGuest(scanToken)} disabled={!guestCardId}>Thibitisha Kuingia</button>
          {scanResult && <p role="status" className="message">{scanResult}</p>}
          <h2>Wageni wa tukio hili ({eCardGuests.length})</h2>
          {eCardGuests.map(g => <div key={g.id} style={{padding:'10px',borderBottom:'1px solid #ddd'}}>
            <strong>{g.guest_name}</strong> — {g.invite_type.toUpperCase()} ({g.guest_count})
            <span> · {g.checked_in_at ? 'Ameingia' : 'Bado hajaingia'}</span>
            <button type="button" className="secondary-button" onClick={() => setScanToken(g.token)}>Chagua token</button>
          </div>)}
        </div>
      )}

      {page === 'ecard' && (
        <>
          <div className="page-header">
            <div><h1>Digital E-card</h1><p>Tengeneza na usambaze mialiko ya kidigitali.</p></div>
            <button type="button" className="secondary-button" onClick={loadECards}>Refresh</button>
          </div>
          <div className="card">
            <h2>Muundo rasmi wa ForteEvents</h2>
            <p>Kadi ya dhahabu na nyeupe imeandaliwa tayari. Mteja anahariri taarifa zake kwenye muundo huu; fremu, mpangilio na mapambo hubaki vilevile.</p>
          </div>
          <div className="card">
            <h2>{editingECardId ? 'Hariri E-card' : 'Tengeneza E-card mpya'}</h2>
            <div className="ecard-sample-first-intro">
              <h2>Kadi ya mfano — hariri taarifa zake</h2>
              <p>Hii ndiyo kadi ambayo mteja atatumia. Badilisha taarifa kwenye sehemu zilizo chini; muonekano wa kadi utajisasisha papo hapo.</p>
            </div>
            <div className="ecard-professional-preview" aria-label="Muonekano wa kadi ya mwaliko">
              <div className="ecard-main-panel">
                
                <div className="ecard-brand-lockup"><img src="/forteevents-logo.png" alt="ForteEvents" /></div>
                <div className="ecard-main-heading">
                  <div className="ecard-document-title">KADI YA MWALIKO</div>
                  <div className="ecard-script-title">{eCardForm.occasion || 'MWALIKO'}</div>
                  <div className="ecard-invitation-label">INVITATION</div>
                </div>
                <ECardFloralOrnament className="ecard-floral-top" />
                <div className="ecard-family-copy"><span>Familia ya</span><strong>{eCardForm.host_names || 'JINA LA FAMILIA'}</strong></div>
                <ECardInvitationCopy card={eCardForm} recipientName={guestName.trim() || '[JINA LA MWALIKWA]'} />
                <div className="ecard-date-line">{eCardForm.event_date ? new Date(eCardForm.event_date+'T00:00:00').toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'SIKU, TAREHE NA MWAKA'}</div>
                <ECardDetails card={eCardForm} showDate={false} />
                {eCardForm.location_url && <div className="ecard-map-link-section ecard-preview-map"><div className="ecard-map-link-heading">RAMANI YA UKUMBI</div><a className="ecard-map-link-url" href={eCardForm.location_url} target="_blank" rel="noopener noreferrer">{eCardForm.location_url}</a></div>}
                <ECardFamilyMessage message={eCardForm.message} />
                <ECardFloralOrnament className="ecard-floral-bottom" />
              </div>
              <aside className="ecard-pass-panel">
                <ECardFloralOrnament className="ecard-pass-floral-art" />
                <div className="ecard-pass-ribbon">YOUR GUEST PASS</div>
                <div className="ecard-pass-name">{guestName.trim() || "JINA LA MWALIKWA"}</div>
                <div className="ecard-pass-type">{guestType === "single" ? "SINGLE · MTU 1" : "DOUBLE · WATU 2"}</div>
                <div className="ecard-pass-qr"><GuestQr value={window.location.origin + '/?ecard-preview=forteevents'} /></div>
                <div className="ecard-pass-checkin">✓ &nbsp; Scan at Check-in</div>
                <p>ForteEvents · Make your event extraordinary</p>
              </aside>
            </div>
            <form onSubmit={saveECard}>
              <label>Jina la tukio</label>
              <input value={eCardForm.title} onChange={e => setECardForm(v => ({...v, title:e.target.value}))} placeholder="Mfano: Harusi ya John na Mary" required />
              <label>Aina ya tukio</label>
              <select value={eCardForm.occasion} onChange={e => setECardForm(v => ({...v, occasion:e.target.value}))}>
                <option>Harusi</option><option>Send-off</option><option>Kipaimara</option><option>Graduation</option><option>Birthday</option><option>Kitchen Party</option><option>Shukrani</option><option>Kupongeza</option><option>Kumuaga</option><option>Tukio lingine</option>
              </select>
              <label>Jina la familia inayoalika</label>
              <input value={eCardForm.host_names} onChange={e => setECardForm(v => ({...v, host_names:e.target.value}))} placeholder="Mfano: Bwana na Bi. Amini Mlashi" />
              <label>Tarehe</label>
              <input type="date" value={eCardForm.event_date} onChange={e => setECardForm(v => ({...v, event_date:e.target.value}))} required />
              <label>Muda wa tukio</label>
              <input type="time" value={eCardForm.event_time} onChange={e => setECardForm(v => ({...v, event_time:e.target.value}))} />
              <label>Jina la bibi harusi</label>
              <input value={eCardForm.bride_name} onChange={e => setECardForm(v => ({...v, bride_name:e.target.value}))} />
              <label>Jina la bwana harusi</label>
              <input value={eCardForm.groom_name} onChange={e => setECardForm(v => ({...v, groom_name:e.target.value}))} />
              <label>Muda wa ibada</label>
              <input type="time" value={eCardForm.ceremony_time} onChange={e => setECardForm(v => ({...v, ceremony_time:e.target.value}))} />
              <label>Mahali pa ibada</label>
              <input value={eCardForm.ceremony_venue} onChange={e => setECardForm(v => ({...v, ceremony_venue:e.target.value}))} />
              <label>Muda wa reception</label>
              <input type="time" value={eCardForm.reception_time} onChange={e => setECardForm(v => ({...v, reception_time:e.target.value}))} />
              <label>Mahali pa reception</label>
              <input value={eCardForm.reception_venue} onChange={e => setECardForm(v => ({...v, reception_venue:e.target.value}))} />
              <label>Ujumbe wa chakula / mapokezi</label>
              <input value={eCardForm.food_note} onChange={e => setECardForm(v => ({...v, food_note:e.target.value}))} />
              <label>Dress code</label>
              <input value={eCardForm.dress_code} onChange={e => setECardForm(v => ({...v, dress_code:e.target.value}))} />
              <label>Rangi za dress code (hadi 3, tenga kwa koma)</label>
              <input value={(eCardForm.dress_colors || []).join(', ')} onChange={e => setECardForm(v => ({...v, dress_colors:e.target.value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,3)}))} placeholder="Gold, Cream, White" />
              <label>Tarehe ya mwisho ya RSVP</label>
              <input type="date" value={eCardForm.rsvp_deadline} onChange={e => setECardForm(v => ({...v, rsvp_deadline:e.target.value}))} />
              <label>Jina la mawasiliano 1</label>
              <input value={eCardForm.rsvp_contact_name} onChange={e => setECardForm(v => ({...v, rsvp_contact_name:e.target.value}))} />
              <label>Simu ya mawasiliano 1</label>
              <input value={eCardForm.rsvp_contact_phone} onChange={e => setECardForm(v => ({...v, rsvp_contact_phone:e.target.value}))} />
              <label>Jina la mawasiliano 2</label>
              <input value={eCardForm.rsvp_contact_name_2} onChange={e => setECardForm(v => ({...v, rsvp_contact_name_2:e.target.value}))} />
              <label>Simu ya mawasiliano 2</label>
              <input value={eCardForm.rsvp_contact_phone_2} onChange={e => setECardForm(v => ({...v, rsvp_contact_phone_2:e.target.value}))} />
              <label>Mahali / Ukumbi</label>
              <input value={eCardForm.venue} onChange={e => setECardForm(v => ({...v, venue:e.target.value}))} placeholder="Jina la ukumbi na eneo" />
              <label>Google Maps location link (hiari)</label>
              <input type="url" value={eCardForm.location_url} onChange={e => setECardForm(v => ({...v, location_url:e.target.value}))} placeholder="Bandika link ya Google Maps ya ukumbi" />
              <p style={{fontSize:'13px'}}>Fungua eneo kwenye Google Maps, bonyeza Share, kisha Copy link na ubandike hapa.</p>
              <label>Ujumbe wa Familia</label>
              <textarea rows="4" value={eCardForm.message} onChange={e => setECardForm(v => ({...v, message:e.target.value}))} placeholder="Karibu sana, uwepo wako kwetu ni furaha na heshima kubwa. Tunatazamia kusherehekea nawe siku hii ya pekee." />
              <p className="ecard-form-hint">Ujumbe huu utaonekana chini ya taarifa za mwaliko. Unaweza kuubadilisha au kuacha mfano huu.</p>
              <label>Pakia picha ya mwaliko (JPG, PNG au WEBP; hadi 5MB)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async e => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 5 * 1024 * 1024) { setECardMessage('Picha isizidi 5MB.'); e.target.value = ''; return }
                const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
                if (!window.crypto?.randomUUID) {
                  setECardMessage('Kivinjari hiki hakiwezi kutengeneza jina salama la faili. Tafadhali tumia kivinjari kilichosasishwa.')
                  return
                }
                const path = session.user.id + '/' + window.crypto.randomUUID() + '.' + ext
                setECardSaving(true)
                const { error } = await supabase.storage.from('e-card-images').upload(path, file, { upsert: false, contentType: file.type })
                if (error) setECardMessage('Picha haikupakiwa: ' + error.message)
                else {
                  const { data } = supabase.storage.from('e-card-images').getPublicUrl(path)
                  setECardForm(v => ({...v, image_url:data.publicUrl}))
                  setECardMessage('Picha imepakiwa.')
                }
                setECardSaving(false)
              }} />
              {eCardForm.image_url && <img src={eCardForm.image_url} alt="Picha iliyochaguliwa" style={{width:'100%',maxWidth:'240px',borderRadius:'8px',marginTop:'8px'}} />}
              <label>Au weka link ya picha (hiari, https://)</label>
              <input type="url" value={eCardForm.image_url} onChange={e => setECardForm(v => ({...v, image_url:e.target.value}))} placeholder="https://..." />
              <p className="ecard-helper-note">Maandishi ya heshima na muundo wa mwaliko ni sehemu ya kiolezo rasmi. Jaza taarifa za familia, wahusika, tarehe na maeneo; sehemu za IBADA, MAPOKEZI, CHAKULA na RSVP ni hiari.</p>
              <button type="submit" className="primary-button" disabled={eCardSaving}>{eCardSaving ? 'Inahifadhi...' : 'Hifadhi E-card'}</button>
              {editingECardId && <button type="button" className="secondary-button" onClick={resetECardForm}>Acha kuhariri</button>}
            </form>

{eCardMessage && <p className="message" role="status">{eCardMessage}</p>}
          </div>
          <div className="card">
            <h2>Salio la E-card</h2>
            <p style={{fontSize:'28px',fontWeight:'700',color:'#9a792d'}}>TSh {Number(eCardWalletBalance).toLocaleString()}</p>
            <p>Kila mwaliko wenye jina na QR Code unagharimu TSh 500. Wasiliana na ForteEvents ili kuongeza salio baada ya malipo.</p>
            {eCardWalletLoading && <p>Inapakia salio...</p>}
          </div>
          <div className="card" style={{marginTop:'20px'}}>
            <h2>Ingiza wageni kwa CSV</h2>
            <p>Andaa faili lenye safu mbili: <strong>name,type</strong>. Mfano: Asha,single au Juma,double. Kila mgeni atakatwa TSh 500 kwenye E-card balance.</p>
            <input type="file" accept=".csv,text/csv" disabled={!guestCardId || guestBusy} onChange={async e => {
              const file=e.target.files?.[0]; if(!file) return;
              const raw=await file.text();
              const rows=raw.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
              const parsed=rows.map(line=>line.split(',').map(value=>value.trim().replace(/^"|"$/g,'')));
              const start=parsed[0]?.[0]?.toLowerCase()==='name' ? 1 : 0;
              const guests=parsed.slice(start).filter(row=>row[0]).map(row=>({name:row[0],type:(row[1]||'single').toLowerCase()}));
              if(!guests.length || guests.some(g=>!['single','double'].includes(g.type))) { setECardMessage('CSV haiko sahihi. Tumia name,type na aina single au double.'); e.target.value=''; return; }
              if(!window.confirm('Una uhakika kuongeza wageni '+guests.length+'? Jumla ya makato ni TSh '+(guests.length*500).toLocaleString()+'.')) {e.target.value='';return;}
              setGuestBusy(true); let added=0; let failed='';
              for(const guest of guests) {
                const {error}=await supabase.rpc('create_paid_e_card_guest',{p_card_id:guestCardId,p_guest_name:guest.name,p_invite_type:guest.type});
                if(error){failed=error.message;break;} added++;
              }
              setGuestBusy(false); await loadECardGuests(guestCardId); await loadECardWallet();
              setECardMessage('Wageni '+added+' wameongezwa.'+(failed?' Imesimama: '+failed:''));
              e.target.value='';
            }} />
          </div>
          <div className="card" style={{marginTop:'20px'}}>
            <h2>Wageni na QR zao</h2>
            <button type="button" className="secondary-button no-print" onClick={() => window.print()} disabled={!eCardGuests.length}>Chapisha wageni wote / Hifadhi PDF</button>
            <label>Chagua kadi ya tukio</label>
            <select value={guestCardId} onChange={e => { setGuestCardId(e.target.value); loadECardGuests(e.target.value) }}>
              <option value="">Chagua E-card</option>
              {eCards.map(card => <option key={card.id} value={card.id}>{card.title}</option>)}
            </select>
            <form onSubmit={addECardGuest}>
              <label>Jina la mwalikwa (andika jina pekee; cheo rasmi huongezwa moja kwa moja)</label>
              <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Jina la mgeni" required />
              <label>Aina ya kadi</label>
              <select value={guestType} onChange={e => setGuestType(e.target.value)}><option value="single">SINGLE</option><option value="double">DOUBLE</option></select>
              <button type="submit" className="primary-button" disabled={!guestCardId || guestBusy}>{guestBusy ? 'Inaongeza...' : 'Ongeza mgeni na QR'}</button>
            </form>
            {eCardGuests.map(g => {
              const card = eCards.find(item => item.id === guestCardId)
              const guestUrl = window.location.origin + '/?card=' + encodeURIComponent(card?.slug || '') + '&guest=' + encodeURIComponent(g.token)
              return <div key={g.id} className="ecard-guest-print ecard-guest-sheet">
                <div className="ecard-guest-card">
                  <div className="ecard-brand-mark">ForteEvents <small>Making your event extraordinary</small></div>
                  <h2>Mwaliko wa {card?.occasion || 'Tukio'}</h2>
                  <div className="ecard-guest-intro">Familia ya {card?.host_names || 'familia zetu'}</div>
                  <ECardInvitationCopy card={card} recipientName={g.guest_name} className="ecard-guest-invitation" />
                  <ECardDetails card={card} className="ecard-guest-details" />
                  <ECardFamilyMessage message={card?.message} />
                  <div className="ecard-guest-bottom"><div><small>ForteEvents · Make your event extraordinary</small></div><div className="ecard-qr-wrap"><GuestQr value={guestUrl} /><strong>{g.invite_type.toUpperCase()} · {g.guest_count || (g.invite_type === 'double' ? 2 : 1)}</strong></div></div>
                </div>
                <div className="no-print ecard-guest-actions"><span>{g.checked_in_at ? 'Ameingia' : 'Bado hajaingia'}</span><button type="button" className="secondary-button" onClick={async()=>{try{const png=await createECardPng({...card},g);const href=URL.createObjectURL(png);const a=document.createElement('a');a.href=href;a.download='ForteEvents-'+g.guest_name.replace(/[^a-z0-9]/gi,'-')+'.png';a.click();URL.revokeObjectURL(href)}catch(error){setECardMessage(error.message)}}}>Pakua PNG</button><button type="button" className="secondary-button" onClick={async()=>{try{const png=await createECardPng({...card},g);const file=new File([png],'ForteEvents-'+g.guest_name.replace(/[^a-z0-9]/gi,'-')+'.png',{type:'image/png'});const text='Karibu kwenye '+(card?.title||'sherehe yetu')+'. Fungua mwaliko wako: '+guestUrl;if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],text,title:card?.title||'Mwaliko wa ForteEvents'})}else{const href=URL.createObjectURL(png);const a=document.createElement('a');a.href=href;a.download=file.name;a.click();URL.revokeObjectURL(href);window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');setECardMessage('Picha imepakuliwa. Ambatisha picha hiyo kwenye WhatsApp iliyofunguliwa.')}}catch(error){setECardMessage('Imeshindikana kushiriki: '+error.message)}}}>Shiriki picha + link</button><button type="button" className="secondary-button" onClick={()=>window.print()}>Chapisha</button></div>
              </div>
            })}
          </div>
          <div className="card" style={{marginTop:'20px'}}>
            <h2>Kadi Zangu</h2>
            {eCardsLoading ? <p>Inapakia...</p> : eCards.length === 0 ? <p>Bado hujatengeneza E-card.</p> : eCards.map(card => (
              <div key={card.id} style={{border:'1px solid #d6bd78',borderRadius:'10px',padding:'16px',marginBottom:'12px'}}>
                <h3>{card.title}</h3><p>{card.occasion} · {card.event_date}</p>
                <p><strong>Hali:</strong> {card.is_published ? 'Imechapishwa' : 'Haijachapishwa'}</p>
                <button type="button" className="secondary-button" onClick={() => editECard(card)}>Hariri</button>{' '}
                <button type="button" className="secondary-button" onClick={() => toggleECardPublished(card)}>{card.is_published ? 'Ficha link' : 'Chapisha / Washa link'}</button>{' '}
                <button type="button" className="secondary-button" onClick={() => deleteECard(card)}>Futa</button>
                {card.is_published && <>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
                    <button type="button" className="primary-button" onClick={() => shareECard(card, 'link', setECardMessage)}>WhatsApp — Link</button>
                    <button type="button" className="secondary-button" onClick={() => shareECard(card, 'image', setECardMessage)}>WhatsApp — Picha</button>
                    <button type="button" className="secondary-button" onClick={() => shareECard(card, 'both', setECardMessage)}>WhatsApp — Link + Picha</button>
                    <button type="button" className="secondary-button" onClick={async () => {
                      const url = window.location.origin + '/?card=' + encodeURIComponent(card.slug);
                      try {
                        await navigator.clipboard.writeText(url);
                        setECardMessage('Link ya mwaliko imenakiliwa. Unaweza kuibandika WhatsApp au SMS.');
                      } catch {
                        setECardMessage('Imeshindikana kunakili link. Tafadhali nakili link inayoonekana hapa chini.');
                      }
                    }}>Nakili link</button>
                  </div>
                  <p style={{wordBreak:'break-all',marginTop:'10px'}}>Link: <a href={window.location.origin + '/?card=' + encodeURIComponent(card.slug)} target="_blank" rel="noreferrer">{window.location.origin + '/?card=' + card.slug}</a></p>
                </>}
              </div>
            ))}
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
                    <div>
                      <label>Kundi la contacts</label>
                      <select
                        value={activeSmsContactGroup}
                        onChange={(e) => {
                          setActiveSmsContactGroup(e.target.value);
                          setContactGroupName(e.target.value);
                          setSelectedContactIds([]);
                          setEditingContactId(null);
                          setContactName('');
                          setContactPhone('');
                        }}
                        style={{ width: '100%', marginBottom: '10px' }}
                      >
                        {smsContactGroups.map((group) => (
                          <option key={group.id || group.name} value={group.name}>
                            {group.name} ({smsContacts.filter((contact) => (contact.group_name || 'Contacts Zangu') === group.name).length})
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <button type="button" className="secondary-button" onClick={renameSmsContactGroup} disabled={contactsSaving}>
                          Hariri jina
                        </button>
                        <button type="button" className="secondary-button" onClick={deleteSmsContactGroup} disabled={contactsSaving}>
                          Futa kundi tupu
                        </button>
                      </div>
                      <label>Jina la kundi jipya</label>
                      <input
                        type="text"
                        value={contactGroupName}
                        onChange={(e) => setContactGroupName(e.target.value)}
                        placeholder="Mfano: Send Off Kadi, Wateja wa Harusi"
                      />
                      <button
                        type="button"
                        onClick={createSmsContactGroup}
                        disabled={contactsSaving}
                        style={{ marginTop: '6px', marginBottom: '12px' }}
                      >
                        {contactsSaving ? 'Inahifadhi...' : 'Hifadhi / Fungua kundi'}
                      </button>
                      <label>Jina la contact</label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Mfano: John"
                      />
                      <label style={{ display: 'block', marginTop: '10px' }}>Namba ya simu</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Mfano: 255712345678"
                      />
                      <button
                        type="button"
                        className="primary-button"
                        disabled={contactsSaving}
                        onClick={(e) => saveSmsContact(e)}
                        style={{ marginTop: '10px' }}
                      >
                        {contactsSaving ? 'Inahifadhi...' : editingContactId ? 'Hifadhi Mabadiliko' : 'Hifadhi Contact'}
                      </button>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong>{activeSmsContactGroup} ({smsContacts.filter((contact) => (contact.group_name || 'Contacts Zangu') === activeSmsContactGroup).length})</strong>
                        <button type="button" onClick={loadSmsContacts} disabled={contactsLoading}>
                          {contactsLoading ? 'Inapakia...' : 'Refresh'}
                        </button>
                      </div>

                      {contactsLoading && <p>Inapakia contacts...</p>}
                      {!contactsLoading && smsContacts.filter((contact) => (contact.group_name || 'Contacts Zangu') === activeSmsContactGroup).length === 0 && (
                        <p style={{ fontSize: '13px' }}>Kundi hili bado halina contacts. Unaweza kuongeza contact ya kwanza hapo juu.</p>
                      )}

                      {smsContacts.filter((contact) => (contact.group_name || 'Contacts Zangu') === activeSmsContactGroup).length > 0 && (
                        <div style={{ overflowX: 'auto', marginTop: '10px', border: '1px solid #e5e5e5', borderRadius: '8px', background: '#fff' }}>
                          <table style={{ width: '100%', minWidth: '360px', borderCollapse: 'collapse', color: '#222', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ background: '#f7f4ed' }}>
                                <th style={{ padding: '10px', width: '42px' }}>Chagua</th>
                                <th style={{ padding: '10px' }}>Jina</th>
                                <th style={{ padding: '10px' }}>Namba ya simu</th>
                                <th style={{ padding: '10px' }}>Kitendo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {smsContacts.filter((contact) => (contact.group_name || 'Contacts Zangu') === activeSmsContactGroup).map((contact) => (
                                <tr key={contact.id} style={{ borderTop: '1px solid #eee' }}>
                                  <td style={{ padding: '10px' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedContactIds.includes(String(contact.id))}
                                      onChange={(e) => setSelectedContactIds((previous) =>
                                        e.target.checked
                                          ? [...previous, String(contact.id)]
                                          : previous.filter((id) => id !== String(contact.id))
                                      )}
                                    />
                                  </td>
                                  <td style={{ padding: '10px', fontWeight: '600' }}>{contact.name || 'Bila jina'}</td>
                                  <td style={{ padding: '10px', color: '#111', fontSize: '14px', fontFamily: 'monospace', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>
                                    {contact.phone || 'Namba haipo'}
                                  </td>
                                  <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                    <button type="button" onClick={() => editSmsContact(contact)} style={{ marginRight: '6px' }}>Edit</button>
                                    <button type="button" onClick={() => deleteSmsContact(contact.id)}>
                                      Futa
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

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