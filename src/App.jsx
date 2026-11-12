import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabaseClient'
import './App.css'
import { ECARD_TEMPLATES as BUILT_IN_ECARD_TEMPLATES, getECardTemplate } from './ecard/templateRegistry.js'


function GuestQr({ value, alt = 'QR ya mwaliko', style }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    setSrc('')
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 600,
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

function getECardDesignData(card){
  let design=card?.design
  if(typeof design==='string'){
    try{design=JSON.parse(design)}catch{design={}}
  }
  return design && typeof design==='object' ? design : {}
}
function getECardTemplateConfig(card){
  const design=getECardDesignData(card)
  const config=design?.templateConfig || design?.template_config || {}
  return config && typeof config==='object' ? config : {}
}
const ECARD_TEMPLATE_FIELDS=[
  ['title','Jina la tukio'],['occasion','Aina ya tukio'],['host_names','Familia inayoalika'],['bride_name','Jina la bibi harusi'],['groom_name','Jina la bwana harusi'],['event_date','Tarehe'],['event_time','Muda wa tukio'],['venue','Mahali / ukumbi'],['ceremony_time','Muda wa ibada'],['ceremony_venue','Mahali pa ibada'],['reception_time','Muda wa mapokezi'],['reception_venue','Mahali pa mapokezi'],['food_note','Maelezo ya chakula'],['dress_code','Dress code'],['dress_colors','Rangi za dress code'],['rsvp_deadline','Tarehe ya mwisho ya RSVP'],['rsvp_contact_name','Jina la mawasiliano 1'],['rsvp_contact_phone','Simu ya mawasiliano 1'],['rsvp_contact_name_2','Jina la mawasiliano 2'],['rsvp_contact_phone_2','Simu ya mawasiliano 2'],['location_url','Link ya ramani'],['message','Ujumbe wa familia'],['image_url','Picha ya mwaliko']
]
function getSavedECardTemplateId(card){
  const design=getECardDesignData(card)
  return design?.templateId || design?.template_id || card?.template_id || card?.templateId || 'forte-ivory-gold-rose'
}
function getSavedECardTemplate(card,fallbackTemplateId){
  const design=getECardDesignData(card)
  const id=design?.templateSnapshot?.id || fallbackTemplateId || getSavedECardTemplateId(card)
  const base=getECardTemplate(id)
  const snapshot=design?.templateSnapshot || {}
  return {...base,...snapshot,id:snapshot.id||id,style:snapshot.style||base?.style||'ivory-gold',artwork:snapshot.artwork||snapshot.image_url||base?.artwork,aspectRatio:snapshot.aspectRatio||base?.aspectRatio||'5 / 7'}
}

const ECARD_DRESS_PALETTE = [
  {value:'Black',label:'Nyeusi',hex:'#171717'}, {value:'White',label:'Nyeupe',hex:'#ffffff'},
  {value:'Gold',label:'Dhahabu',hex:'#c79a35'}, {value:'Silver',label:'Fedha',hex:'#c4c9cf'},
  {value:'Navy',label:'Bluu iliyokolea',hex:'#172c50'}, {value:'Blue',label:'Bluu',hex:'#3268a8'},
  {value:'Red wine',label:'Maroon',hex:'#702b3b'}, {value:'Red',label:'Nyekundu',hex:'#b72e36'},
  {value:'Green',label:'Kijani',hex:'#277b50'}, {value:'Green mint',label:'Mint',hex:'#8bcbb0'},
  {value:'Orange',label:'Machungwa',hex:'#d97732'}, {value:'Brown',label:'Kahawia',hex:'#79533a'},
  {value:'Pink',label:'Waridi',hex:'#e6a9bc'}, {value:'Purple',label:'Zambarau',hex:'#76518e'},
  {value:'Cream',label:'Cream',hex:'#f2e6c9'}, {value:'Beige',label:'Beige',hex:'#d9c6a0'}
]
function buildECardInvitationParts(card,recipientName='[JINA LA MWALIKWA]',copy={}){
 const occasion=String(card?.occasion||'').toLowerCase();let eventLine,coupleName=''
 if(occasion.includes('send'))eventLine='kwenye send-off ya binti yao '+(card?.title||'[JINA LA MHUSIKA]')+'.'
 else if(occasion.includes('harusi')){coupleName=[card?.bride_name,card?.groom_name].filter(Boolean).join(' na ')||card?.title||'[MAJINA YA BIBI NA BWANA HARUSI]';eventLine='kwenye harusi ya vijana wao wapendwa'}
 else eventLine='kwenye '+String(card?.occasion||'tukio').toLowerCase()+' ya '+(card?.title||'[JINA LA TUKIO]')+'.'
 if(copy.eventLine)eventLine=String(copy.eventLine).replaceAll('{event}',card?.title||'[JINA LA TUKIO]').replaceAll('{occasion}',card?.occasion||'tukio').replaceAll('{couple}',coupleName)
 if(copy.coupleName)coupleName=String(copy.coupleName).replaceAll('{bride}',card?.bride_name||'').replaceAll('{groom}',card?.groom_name||'').replaceAll('{event}',card?.title||'')
 return {intro:copy.invitationIntro||'Wanayo furaha kukualika',titles:copy.invitationTitles||'Bw. & Bi. Mhe. Pro. Dkt. Mch. Eng. Bw. au Bi.',recipient:recipientName||'[JINA LA MWALIKWA]',eventLine,coupleName}
}
function ECardInvitationCopy({card,recipientName,className='',hideCouple=false,copy={},editorProps={}}){const p=buildECardInvitationParts(card,recipientName,copy);return <div {...editorProps} className={['ecard-invitation-copy',className].filter(Boolean).join(' ')}><p>{p.intro}</p><strong className="ecard-invitation-titles">{p.titles}</strong><strong className="ecard-invitation-recipient">— {p.recipient} —</strong><p>{p.eventLine}</p>{!hideCouple&&p.coupleName&&<strong className="ecard-invitation-couple">— {p.coupleName} —</strong>}</div>}

function LuxuryFloralECardArtwork({card,recipientName,guest,qrUrl,exportMode=false,layoutEditor=false,onLayoutChange,selectedLayoutKey,onSelectLayoutElement}){
  const config=getECardTemplateConfig(card); const layout=config.layout||{}; const copy=config.copy||{};
  const dragRef=useRef(null);
  const elementStyle=(key)=>{const item=layout[key]||{};return {display:config.visibility?.[key]===false?'none':undefined,transform:'translate('+Number(item.dx||0)+'cqw, '+(Number(item.dy||0)*1.4)+'cqw) scale('+Number(item.scale||1)+')',transformOrigin:'center center'};};
  const elementProps=(key)=>({ 'data-editor-element':key, style:elementStyle(key), onPointerDown:event=>{if(!layoutEditor)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture?.(event.pointerId);dragRef.current={key,x:event.clientX,y:event.clientY,dx:Number(layout[key]?.dx||0),dy:Number(layout[key]?.dy||0)};onSelectLayoutElement?.(key);} });
  const moveDrag=(event)=>{if(!layoutEditor||!dragRef.current)return;const rect=event.currentTarget.getBoundingClientRect();const d=dragRef.current;const dx=d.dx+(event.clientX-d.x)/rect.width*100;const dy=d.dy+(event.clientY-d.y)/rect.height*100;onLayoutChange?.(v=>({...v,layout:{...(v.layout||{}),[d.key]:{...(v.layout?.[d.key]||{}),dx,dy}}}));};
  const stopDrag=()=>{dragRef.current=null;};
  const parts=buildECardInvitationParts(card,guest?.guest_name||recipientName||'JINA LA MWALIKWA',copy);
  const dateText=card?.event_date?new Date(card.event_date+'T00:00:00').toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'SIKU, TAREHE NA MWAKA';
  const colors={'gold':'#c69a32','cream':'#f2e6c9','white':'#fff','black':'#222','red':'#b52d35','blue':'#3567a8','navy':'#182b4b','pink':'#e8a6b8','green':'#477b53','silver':'#c7cbd1','purple':'#76518e','brown':'#79533a','orange':'#d97927','maroon':'#702b3b','beige':'#d9c6a0','grey':'#888','gray':'#888','red wine':'#702b3b'};
  const dressColors=Array.isArray(card?.dress_colors)?card.dress_colors:[];
  const contactLines=[[card?.rsvp_contact_name,card?.rsvp_contact_phone].filter(Boolean).join(' · '),[card?.rsvp_contact_name_2,card?.rsvp_contact_phone_2].filter(Boolean).join(' · ')].filter(Boolean);
  const ceremony=[card?.ceremony_time,card?.ceremony_venue].filter(Boolean).join(' · ');
  const reception=[card?.reception_time,card?.reception_venue].filter(Boolean).join(' · ');
  const flowerEditorProps=(key)=>({...elementProps(key),style:{...elementStyle(key),display:config.visibility?.[key]===true?'block':'none'}});
  return <article onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} style={{'--ecard-admin-accent':config.style?.accent||'#a77b20','--ecard-admin-text':config.style?.text||'#252018','--ecard-admin-font':config.style?.font||'Georgia, serif'}} className={['ecard-luxury-floral-card','ecard-admin-styled',exportMode?'ecard-luxury-export':'',layoutEditor?'ecard-layout-editing':''].filter(Boolean).join(' ')} aria-label="Luxury Floral Gold wedding invitation">
    <img className="ecard-luxury-background" {...elementProps('background')} src={config.media?.backgroundUrl||"/ecard-templates/luxury-floral-gold-bg.webp"} alt="" crossOrigin="anonymous"/>
    <ECardFloralOrnament className="ecard-studio-flower ecard-studio-flower-top" variant="ivory-gold" editorProps={flowerEditorProps('flowerTop')}/>
    <ECardFloralOrnament className="ecard-studio-flower ecard-studio-flower-bottom" variant="ivory-gold" editorProps={flowerEditorProps('flowerBottom')}/>
    <div className="ecard-luxury-heading" {...elementProps('heading')}>
      <div className="ecard-luxury-kicker" {...elementProps('kicker')}>{copy.kicker||'KADI YA MWALIKO'}</div>
      <div className="ecard-luxury-occasion" {...elementProps('occasion')}>{card?.occasion||'Harusi'}</div>
    </div>
    <div className="ecard-luxury-family" {...elementProps('family')}><span>{copy.familyLabel||'Familia ya'}</span><strong>{card?.host_names||'JINA LA FAMILIA'}</strong></div>
    <ECardInvitationCopy card={card} recipientName={guest?.guest_name||recipientName||'JINA LA MWALIKWA'} className="ecard-luxury-invite-copy" hideCouple copy={copy} editorProps={elementProps('invitation')}/>
    <div className="ecard-luxury-couple" {...elementProps('couple')}>{parts.coupleName||'MAJINA YA BIBI NA BWANA HARUSI'}</div>
    <div className="ecard-luxury-date" {...elementProps('date')}>{dateText}</div>
    <div className="ecard-luxury-details" {...elementProps('details')}>
      <div className="ecard-luxury-detail-column">
        {card?.event_time&&<div className="ecard-luxury-detail"><i>◷</i><span><b>{copy.detailLabels?.MUDA||'MUDA'}:</b> Saa {card.event_time}</span></div>}
        {card?.venue&&<div className="ecard-luxury-detail"><i>⌂</i><span><b>{copy.detailLabels?.MAHALI||'MAHALI'}:</b> {card.venue}</span></div>}
        {card?.rsvp_deadline&&<div className="ecard-luxury-detail"><i>✉</i><span><b>{copy.detailLabels?.RSVP||'RSVP'}:</b> Mwisho wa kuthibitisha: {card.rsvp_deadline}</span></div>}
      </div>
      <div className="ecard-luxury-detail-column">
        {ceremony&&<div className="ecard-luxury-detail"><i>♟</i><span><b>{copy.detailLabels?.IBADA||'IBADA'}:</b> {ceremony}</span></div>}
        {(dressColors.length>0||card?.dress_code)&&<div className="ecard-luxury-detail"><i>♟</i><span><b>{copy.detailLabels?.['DRESS CODE']||'DRESS CODE'}:</b> {card?.dress_code&&<>{card.dress_code} </>}{dressColors.map((color,i)=><em key={color+i} title={color} style={{backgroundColor:colors[String(color).toLowerCase()]||'#d8c49b'}}/>)}</span></div>}
        {contactLines.length>0&&<div className="ecard-luxury-contacts">
          <b className="ecard-luxury-contacts-title">{copy.contactsTitle||'MAWASILIANO'}</b>
          <div className="ecard-luxury-contact-list">
            {[[card?.rsvp_contact_name,card?.rsvp_contact_phone],[card?.rsvp_contact_name_2,card?.rsvp_contact_phone_2]].filter(([name,phone])=>name||phone).map(([name,phone],i)=><div className="ecard-luxury-contact" key={i}>
              {name&&<strong>{name}</strong>}
              {phone&&<a href={'tel:'+phone}>{phone}</a>}
            </div>)}
          </div>
        </div>}
      </div>
    </div>
    {reception&&<div className="ecard-luxury-venue" {...elementProps('venue')}><b>{copy.venueTitle||'MAHALI PA MAPOKEZI'}</b><span>{reception}</span>{card?.food_note&&<small>{card.food_note}</small>}</div>}
    {!reception&&card?.food_note&&<div className="ecard-luxury-venue" {...elementProps('venue')}><b>{copy.venueTitle||'TAARIFA ZA MAPOKEZI'}</b><span>{card.food_note}</span></div>}
    <div className="ecard-luxury-message" {...elementProps('message')} style={{...elementStyle('message'),'--ecard-message-size':Math.max(1.65,Math.min(3.05,390/Math.max(125,String(card?.message||'Karibu sana, uwepo wako kwetu ni furaha na heshima kubwa.').trim().length)))+'cqw'}}>{String(card?.message||'Karibu sana, uwepo wako kwetu ni furaha na heshima kubwa.').trim()}</div>
    <div className="ecard-luxury-qr" {...elementProps('qr')}><GuestQr value={qrUrl||window.location.origin+'/?ecard-preview=forteevents'}/></div>
    <div className="ecard-luxury-brand" {...elementProps('brand')}><img src={config.media?.logoUrl||"/forteevents-logo.png"} alt="ForteEvents"/></div>
    <div className="ecard-luxury-tagline-drag" {...elementProps('tagline')}>{copy.brandTagline||'Make your event extraordinary'}</div>
  </article>
}
function ECardFloralOrnament({className='',variant='ivory-gold'}){
  const palettes={
    'ivory-gold':{petal:'#fffdf7',shadow:'#e8dfd1',inner:'#f4eee5',center:'#c79b43',leaf:'#78845d',stem:'#8d7951'},
    'blush-rose':{petal:'#f5cbd2',shadow:'#df9eaa',inner:'#ffe8e8',center:'#a94c60',leaf:'#73856a',stem:'#98705d'},
    'blue-rose':{petal:'#fffdf8',shadow:'#a9bfd4',inner:'#dce8f1',center:'#c69b45',leaf:'#617e91',stem:'#8b795c'}
  };
  const p=palettes[variant]||palettes['ivory-gold'];
  const rose=(x,y,r)=> <g transform={'translate('+x+' '+y+') scale('+r+')'} stroke={p.center} strokeWidth="1.15">
    <ellipse cx="0" cy="-16" rx="11" ry="19" fill={p.petal}/>
    <ellipse cx="0" cy="-16" rx="11" ry="19" fill={p.shadow} transform="rotate(45)"/>
    <ellipse cx="0" cy="-16" rx="11" ry="19" fill={p.petal} transform="rotate(90)"/>
    <ellipse cx="0" cy="-16" rx="11" ry="19" fill={p.shadow} transform="rotate(135)"/>
    <ellipse cx="0" cy="-11" rx="9" ry="15" fill={p.inner} transform="rotate(22)"/>
    <ellipse cx="0" cy="-11" rx="9" ry="15" fill={p.petal} transform="rotate(67)"/>
    <ellipse cx="0" cy="-11" rx="9" ry="15" fill={p.inner} transform="rotate(112)"/>
    <ellipse cx="0" cy="-11" rx="9" ry="15" fill={p.petal} transform="rotate(157)"/>
    <path d="M-7 1 C-8 -10 7 -14 9 -3 C11 6 -2 11 -7 1Z" fill={p.shadow}/>
    <path d="M-4 0 C-4 -7 5 -8 5 -1 C5 4 -2 6 -4 0Z" fill={p.center} stroke="none"/>
    <circle cx="0" cy="0" r="2.5" fill="#f7df9d" stroke="none"/>
  </g>;
  return <svg {...(arguments[0]?.editorProps||{})} className={['ecard-floral-ornament','ecard-floral-'+variant,className].filter(Boolean).join(' ')} viewBox="0 0 300 230" aria-hidden="true" focusable="false">
    <g fill="none" stroke={p.stem} strokeWidth="2.5" strokeLinecap="round">
      <path d="M8 220 C46 185 56 143 103 112 C154 79 213 64 291 8"/>
      <path d="M36 188 C14 169 13 148 22 129 C48 139 55 165 36 188Z" fill={p.leaf}/>
      <path d="M70 151 C43 139 38 115 49 96 C74 108 84 132 70 151Z" fill={p.leaf}/>
      <path d="M116 113 C91 96 93 72 108 55 C130 75 135 98 116 113Z" fill={p.leaf}/>
      <path d="M169 81 C146 61 152 39 171 24 C190 45 190 66 169 81Z" fill={p.leaf}/>
      <path d="M214 54 C204 32 215 15 236 8 C246 31 237 49 214 54Z" fill={p.leaf}/>
      <path d="M91 126 C111 143 131 148 150 143" strokeWidth="1.4"/>
      <path d="M151 91 C166 107 187 111 204 105" strokeWidth="1.4"/>
    </g>
    {rose(192,137,1.08)}
    {rose(105,67,.72)}
    {rose(250,38,.52)}
    <g fill={p.leaf} stroke={p.stem} strokeWidth="1.2"><path d="M137 100 C117 83 119 67 130 57 C149 72 151 89 137 100Z"/><path d="M55 176 C38 155 43 139 58 132 C73 151 70 168 55 176Z"/></g>
    <g fill="none" stroke="#c8a45e" strokeWidth="1.6" opacity=".9"><path d="M9 205 C40 190 52 170 66 150"/><path d="M204 91 C235 73 257 51 279 23"/><path d="M22 215 C60 201 84 178 102 151"/></g>
  </svg>
}
function buildECardDetailItems(card){return [['TAREHE',card?.event_date],['MUDA',card?.event_time?'Saa '+card.event_time:''],['IBADA',[card?.ceremony_time,card?.ceremony_venue].filter(Boolean).join(' · ')],['MAPOKEZI',[card?.reception_time,card?.reception_venue].filter(Boolean).join(' · ')],['MAHALI',card?.location_url?'':card?.venue],['CHAKULA',card?.food_note],['DRESS CODE',(card?.dress_colors||[]).length?'colors':''],['RSVP',card?.rsvp_deadline?'Mwisho wa kuthibitisha: '+card.rsvp_deadline:''],['CONTACT 1',[card?.rsvp_contact_name,card?.rsvp_contact_phone].filter(Boolean).join(' · ')],['CONTACT 2',[card?.rsvp_contact_name_2,card?.rsvp_contact_phone_2].filter(Boolean).join(' · ')]].filter(([,v])=>Boolean(v))}
function ECardDetails({card,className='',showDate=true,copy={}}){const colors={gold:'#c69a32',cream:'#f2e6c9',white:'#fff',black:'#222',red:'#b52d35',blue:'#3567a8',navy:'#182b4b',pink:'#e8a6b8',green:'#477b53',silver:'#c7cbd1',purple:'#76518e',brown:'#79533a',orange:'#d97927',maroon:'#702b3b',beige:'#d9c6a0',grey:'#888',gray:'#888'};return <div className={['ecard-detail-flow',className].filter(Boolean).join(' ')}>{buildECardDetailItems(card).filter(([label])=>showDate||label!=='TAREHE').map(([label,value])=><p className="ecard-detail-line" key={label}>{!label.startsWith('CONTACT')&&<b>{copy.detailLabels?.[label]||label}</b>}<span>{label==='DRESS CODE'?<>{(card?.dress_colors||[]).map((color,i)=><span className="ecard-dress-swatch-item" key={color+i}><i title={color} aria-label={color} style={{backgroundColor:colors[String(color).toLowerCase()]||'#d8c49b'}}/></span>)}</>:label==='CONTACT 1'?<>{card?.rsvp_contact_phone&&<a className="ecard-phone-link" href={'tel:'+card.rsvp_contact_phone}>{card.rsvp_contact_phone}</a>}<strong>{card?.rsvp_contact_name}</strong></>:label==='CONTACT 2'?<>{card?.rsvp_contact_phone_2&&<a className="ecard-phone-link" href={'tel:'+card.rsvp_contact_phone_2}>{card.rsvp_contact_phone_2}</a>}<strong>{card?.rsvp_contact_name_2}</strong></>:value}</span></p>)}</div>}

function ECardFamilyMessage({message}) {
  const value = String(message || '').trim() || DEFAULT_ECARD_MESSAGE
  return <div className="ecard-family-message">{value}</div>
}

function ECardArtwork({card,recipientName='[JINA LA MWALIKWA]',guest=null,qrUrl,exportMode=false,templateId:forcedTemplateId,template:templateOverride,layoutEditor=false,onLayoutChange,onSelectLayoutElement}) {
  const universalConfig=getECardTemplateConfig(card); const universalLayout=universalConfig.layout||{}; const universalDrag=useRef(null);
  const universalElementProps=key=>({ 'data-editor-element':key, style:{display:universalConfig.visibility?.[key]===false?'none':undefined,transform:'translate('+Number(universalLayout[key]?.dx||0)+'cqw, '+(Number(universalLayout[key]?.dy||0)*1.4)+'cqw) scale('+Number(universalLayout[key]?.scale||1)+')',transformOrigin:'center center'}, onPointerDown:event=>{if(!layoutEditor)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture?.(event.pointerId);universalDrag.current={key,x:event.clientX,y:event.clientY,dx:Number(universalLayout[key]?.dx||0),dy:Number(universalLayout[key]?.dy||0)};onSelectLayoutElement?.(key);} });
  const universalMove=event=>{if(!layoutEditor||!universalDrag.current)return;const rect=event.currentTarget.getBoundingClientRect();const d=universalDrag.current;const dx=d.dx+(event.clientX-d.x)/rect.width*100;const dy=d.dy+(event.clientY-d.y)/rect.height*100;onLayoutChange?.(v=>({...v,layout:{...(v.layout||{}),[d.key]:{...(v.layout?.[d.key]||{}),dx,dy}}}));};
  const universalStop=()=>{universalDrag.current=null;};
  const savedTemplateId=forcedTemplateId || getSavedECardTemplateId(card)
  const templateId=savedTemplateId==='forte-white-gold'?'forte-ivory-gold-rose':savedTemplateId==='forte-cream-blue'?'forte-blue-rose':savedTemplateId
  const savedTemplate=getSavedECardTemplate(card,templateId)
  const template=templateOverride && templateOverride.id===templateId ? templateOverride : savedTemplate
  const style=template?.style || 'ivory-gold'
  const templateArtwork=universalConfig.media?.backgroundUrl || template?.artwork || template?.image_url || getECardTemplate(templateId)?.artwork
  const guestType=String(guest?.invite_type || 'single').toLowerCase()
  const displayName=guest?.guest_name || recipientName || 'JINA LA MWALIKWA'
  if(style==='luxury-floral-gold') return <LuxuryFloralECardArtwork card={card} recipientName={displayName} guest={guest} qrUrl={qrUrl} exportMode={exportMode} layoutEditor={layoutEditor} onLayoutChange={onLayoutChange} onSelectLayoutElement={onSelectLayoutElement}/>
  return <article onPointerMove={universalMove} onPointerUp={universalStop} onPointerCancel={universalStop} style={{'--ecard-admin-accent':universalConfig.style?.accent||'#a77b20','--ecard-admin-text':universalConfig.style?.text||'#252018','--ecard-admin-font':universalConfig.style?.font||'Georgia, serif'}} className={['ecard-professional-preview','ecard-admin-styled','ecard-style-'+style,exportMode?'ecard-export-mode':'',layoutEditor?'ecard-layout-editing':''].filter(Boolean).join(' ')} aria-label="Kadi rasmi ya mwaliko">
    <img className="ecard-template-flower ecard-template-flower-top" {...universalElementProps('flowerTop')} crossOrigin="anonymous" src={templateArtwork} alt="" aria-hidden="true"/>
    <img className="ecard-template-flower ecard-template-flower-bottom" {...universalElementProps('flowerBottom')} crossOrigin="anonymous" src={templateArtwork} alt="" aria-hidden="true"/>
    <ECardFloralOrnament className="ecard-studio-flower ecard-studio-flower-top" variant={style==='blush-rose'?'blush-rose':style==='blue-rose'?'blue-rose':'ivory-gold'} editorProps={{...universalElementProps('flowerTop'),style:{...universalElementProps('flowerTop').style,display:universalConfig.visibility?.flowerTop===true?'block':'none'}}}/>
    <ECardFloralOrnament className="ecard-studio-flower ecard-studio-flower-bottom" variant={style==='blush-rose'?'blush-rose':style==='blue-rose'?'blue-rose':'ivory-gold'} editorProps={{...universalElementProps('flowerBottom'),style:{...universalElementProps('flowerBottom').style,display:universalConfig.visibility?.flowerBottom===true?'block':'none'}}}/>
    <div className="ecard-main-panel">
      <div className="ecard-main-heading" {...universalElementProps('heading')}>
        <div className="ecard-document-title">{universalConfig.copy?.kicker||'KADI YA MWALIKO'}</div>
        <div className="ecard-script-title">{card?.occasion || 'MWALIKO'}</div>
        <div className="ecard-invitation-label">{universalConfig.copy?.invitationLabel||'INVITATION'}</div>
      </div>
      {style==='blue-rose' && (card?.image_url
        ? <img className="ecard-card-photo ecard-card-photo-blue" {...universalElementProps('image')} src={card.image_url} alt="Picha ya wanandoa au tukio"/>
        : <div className="ecard-photo-placeholder" aria-label="Sehemu ya picha ya wanandoa"><span>♡</span><small>WEKA PICHA YA WANANDOA</small></div>)}

      <div className="ecard-family-copy" {...universalElementProps('family')}><span>{universalConfig.copy?.familyLabel||'Familia ya'}</span><strong>{card?.host_names || 'JINA LA FAMILIA'}</strong></div>
      <ECardInvitationCopy card={card} recipientName={displayName} editorProps={universalElementProps('invitation')} copy={universalConfig.copy||{}}/>
      {card?.image_url && style!=='blue-rose' && <img className="ecard-card-photo" {...universalElementProps('image')} src={card.image_url} alt="Picha ya tukio"/>}
      <div className="ecard-date-line" {...universalElementProps('date')}>{card?.event_date ? new Date(card.event_date+'T00:00:00').toLocaleDateString('sw-TZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) : 'SIKU, TAREHE NA MWAKA'}</div>
      <div {...universalElementProps('details')}><ECardDetails card={card} showDate={false} copy={universalConfig.copy||{}}/></div>
      {card?.location_url && <div className="ecard-map-link-section" {...universalElementProps('venue')}>
        <div className="ecard-map-link-heading">{universalConfig.copy?.venueTitle||'MAHALI PA TUKIO'}</div>
        <div className="ecard-map-venue-name">{card?.venue || 'Taarifa za ukumbi'}</div>
      </div>}
      <div {...universalElementProps('message')}><ECardFamilyMessage message={card?.message}/></div>
      <section {...universalElementProps('qr')} className="ecard-card-qr-section" aria-label="Msimbo wa kuingia">
        <div className="ecard-card-qr-type">{guestType==='double'?'DOUBLE':'SINGLE'}</div>
        <div className="ecard-card-qr"><GuestQr value={qrUrl || window.location.origin+'/?ecard-preview=forteevents'}/></div>
        <div className="ecard-card-qr-caption">{universalConfig.copy?.qrCaption||'Onyesha QR hii wakati wa kuingia'}</div>
        <div className="ecard-card-brand" {...universalElementProps('brand')}><img src={universalConfig.media?.logoUrl||"/forteevents-logo.png"} alt="ForteEvents"/></div>
      </section>

      <div className="ecard-card-footer" {...universalElementProps('tagline')}>{universalConfig.copy?.footerText||('ForteEvents · '+(universalConfig.copy?.brandTagline||'Make your event extraordinary'))}</div>
    </div>
  </article>
}

async function createECardPng(card, guest = null) {
  const qrPayload=guest?.token ? String(guest.token) : window.location.origin+'/?card='+encodeURIComponent(card.slug || '')
  const host=document.createElement('div')
  host.className='ecard-export-host'
  host.style.cssText='position:fixed;left:-12000px;top:0;width:800px;height:1200px;overflow:visible;pointer-events:none;background:#fff;z-index:2147483000'
  document.body.appendChild(host)
  const root=createRoot(host)
  try {
    const templateId=getSavedECardTemplateId(card)
    const {data:publishedSetting}=await supabase.from('e_card_template_settings').select('config').eq('template_id',templateId).eq('is_published',true).maybeSingle()
    const exportCard=publishedSetting?.config ? {...card,design:{...getECardDesignData(card),templateConfig:publishedSetting.config}} : card
    root.render(<ECardArtwork key={'ecard-export-'+(card?.id||card?.slug||'draft')+'-'+templateId} card={exportCard} templateId={templateId} guest={guest} recipientName={guest?.guest_name || 'JINA LA MWALIKWA'} qrUrl={qrPayload} exportMode/>)
    if(document.fonts?.ready) await document.fonts.ready
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    let qrImage=null
    for(let attempt=0;attempt<100;attempt++){
      qrImage=host.querySelector('.ecard-card-qr img, .ecard-luxury-qr img')
      if(qrImage?.complete && qrImage.naturalWidth>0) break
      await new Promise(resolve=>window.setTimeout(resolve,30))
    }
    if(!qrImage?.complete || !qrImage.naturalWidth) throw new Error('QR ya mwaliko haijaandaliwa. Hakikisha intaneti ipo kisha jaribu tena.')
    const artwork=host.querySelector('.ecard-professional-preview, .ecard-luxury-floral-card')
    if(!artwork) throw new Error('Muundo wa kadi haujaandaliwa.')
    artwork.style.setProperty('width','760px','important')
    artwork.style.setProperty('height','1064px','important')
    artwork.style.setProperty('max-width','none','important')
    artwork.style.setProperty('min-width','760px','important')
    artwork.style.setProperty('aspect-ratio','auto','important')
    artwork.style.setProperty('margin','0','important')
    artwork.style.setProperty('overflow','hidden','important')
    const images=Array.from(artwork.querySelectorAll('img'))
    await Promise.all(images.map(async image=>{
      if(!image.complete) await new Promise(resolve=>{image.onload=resolve;image.onerror=resolve})
      if(image.decode) await image.decode().catch(()=>{})
    }))
    const missing=images.find(image=>!image.naturalWidth)
    if(missing) throw new Error('Picha ya mapambo ya template haijapakia. Refresh ukurasa kisha jaribu tena.')
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
    const canvas=await html2canvas(artwork,{backgroundColor:'#fffdf8',scale:2,useCORS:true,allowTaint:false,logging:false,width:760,height:1064,windowWidth:800,windowHeight:1200,scrollX:0,scrollY:0,x:0,y:0})
    if(canvas.width<1400 || canvas.height<1900) throw new Error('Picha ya kadi imetengenezwa kwa vipimo visivyotosha ('+canvas.width+' × '+canvas.height+'). Jaribu tena.')
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG haikuundwa.')),'image/png'))
  } finally {
    root.unmount()
    host.remove()
  }
}
function downloadECardPng(png, filename='ForteEvents-mwaliko.png') {
  const downloadUrl=URL.createObjectURL(png)
  const anchor=document.createElement('a')
  anchor.href=downloadUrl
  anchor.download=filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),60000)
}

async function shareGuestECard(card, guest, setMessage) {
  const mapLink=String(card?.location_url || '').trim()
  const caption='Mwaliko wako wa ForteEvents.'+(mapLink?'\n\nFungua ramani ya ukumbi:\n'+mapLink:'')
  const whatsappUrl='https://api.whatsapp.com/send?text='+encodeURIComponent(caption)
  const whatsappWindow=window.open(whatsappUrl,'_blank')
  if(!whatsappWindow) window.location.href=whatsappUrl
  setMessage('WhatsApp inafunguka. Picha ya mwaliko inaandaliwa kupakuliwa...')
  try {
    const png=await createECardPng({...card},guest)
    const filename='ForteEvents-'+String(guest?.guest_name || 'mwaliko').replace(/[^a-z0-9]/gi,'-')+'.png'
    downloadECardPng(png,filename)
    setMessage('Picha imepakuliwa. Rudi WhatsApp na uiambatishe kwenye mazungumzo ya mpokeaji.')
  } catch(error) {
    setMessage('WhatsApp imefunguliwa, lakini picha haikuweza kupakuliwa: '+(error?.message || 'Jaribu tena.'))
  }
}

async function shareECard(card, mode, setMessage) {
  const url=window.location.origin+'/?card='+encodeURIComponent(card.slug)
  const mapLink=String(card?.location_url || '').trim()
  const message=`Habari! Tunakualika kwenye ${card.title}.\n\nKIUNGO CHA KADI:\n${url}${mapLink?'\n\nKIUNGO CHA RAMANI YA UKUMBI:\n'+mapLink:''}`
  const whatsappUrl='https://api.whatsapp.com/send?text='+encodeURIComponent(message)
  if(mode==='link' || mode==='both') {
    const whatsappWindow=window.open(whatsappUrl,'_blank')
    if(!whatsappWindow) window.location.href=whatsappUrl
    if(mode==='link') {
      setMessage('WhatsApp inafunguka na ujumbe wa mwaliko uko tayari.')
      return
    }
    setMessage('WhatsApp inafunguka. Picha inaandaliwa kupakuliwa...')
    try {
      const png=await createECardPng(card)
      downloadECardPng(png)
      setMessage('Picha imepakuliwa. Rudi WhatsApp na uiambatishe kwenye mazungumzo.')
    } catch(error) {
      setMessage('WhatsApp imefunguliwa, lakini picha haikuweza kuandaliwa: '+(error?.message || 'Jaribu tena.'))
    }
    return
  }
  setMessage('Inaandaa picha ya mwaliko...')
  try {
    const png=await createECardPng(card)
    downloadECardPng(png)
    setMessage('Picha imepakuliwa. Unaweza kuifungua WhatsApp na kuambatisha picha hiyo.')
  } catch(error) {
    setMessage('Imeshindikana kuandaa picha: '+(error?.message || 'Tafadhali jaribu tena.'))
  }
}


function ECardImageShareButton({card,guest=null,onMessage,label='Shiriki picha WhatsApp'}) {
  const [preparedFile,setPreparedFile]=useState(null)
  const [preparing,setPreparing]=useState(true)
  const [prepareError,setPrepareError]=useState('')
  const prepareImage=async()=>{
    setPreparing(true);setPrepareError('');setPreparedFile(null)
    try{
      const blob=await createECardPng(card,guest)
      const file=new File([blob],'ForteEvents-'+String(guest?.guest_name||card?.title||'mwaliko').replace(/[^a-z0-9]/gi,'-')+'.png',{type:'image/png'})
      setPreparedFile(file);return file
    }catch(error){
      const message=error?.message||'Jaribu tena.'
      setPrepareError(message);onMessage('Picha haikuweza kuandaliwa: '+message);return null
    }finally{setPreparing(false)}
  }
  useEffect(()=>{
    let active=true
    setPreparedFile(null);setPreparing(true);setPrepareError('')
    createECardPng(card,guest).then(blob=>{
      if(active)setPreparedFile(new File([blob],'ForteEvents-'+String(guest?.guest_name||card?.title||'mwaliko').replace(/[^a-z0-9]/gi,'-')+'.png',{type:'image/png'}))
    }).catch(error=>{
      if(active){const message=error?.message||'Jaribu tena.';setPrepareError(message);onMessage('Picha haikuweza kuandaliwa: '+message)}
    }).finally(()=>{if(active)setPreparing(false)})
    return ()=>{active=false}
  },[card?.id,card?.updated_at,card?.design,guest?.id,guest?.token,guest?.guest_name,onMessage])
  const shareImage=()=>{
    if(!preparedFile){if(!preparing)prepareImage();else onMessage('Subiri picha ya kadi ikamilishe kuandaliwa.');return}
    const shareData={files:[preparedFile],text:'Mwaliko wako wa ForteEvents.'+(card?.location_url?'\n\nRamani ya ukumbi: '+card.location_url:'')}
    if(!navigator.share||!navigator.canShare||!navigator.canShare({files:[preparedFile]})){
      onMessage('Kivinjari hiki hakiwezi kutuma picha moja kwa moja. Pakua PNG kisha uiambatishe WhatsApp.');return
    }
    navigator.share(shareData).then(()=>onMessage('Picha imeshirikishwa.')).catch(error=>{
      if(error?.name!=='AbortError')onMessage('Picha haikutumwa: '+(error?.message||'Jaribu tena.'))
    })
  }
  return <button type="button" className="secondary-button" onClick={shareImage} disabled={preparing}>
    {preparing?'Inaandaa picha...':preparedFile?label:'Jaribu tena kuandaa picha'}
  </button>
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


function AdminECardTemplateStudio({session,onBack}){
  const [templates,setTemplates]=useState([]);
  const [selectedId,setSelectedId]=useState('forte-luxury-floral-gold');
  const [config,setConfig]=useState({layout:{},copy:{},permissions:{},defaults:{},style:{}});
  const [selectedElement,setSelectedElement]=useState('qr');
  const [published,setPublished]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const selected=templates.find(t=>t.id===selectedId)||BUILT_IN_ECARD_TEMPLATES[0];
  const elements=[['background','Mandhari ya kadi'],['flowerTop','Ua / pambo la juu'],['flowerBottom','Ua / pambo la chini'],['image','Picha ya tukio'],['heading','Kichwa cha juu'],['kicker','Andiko KADI YA MWALIKO'],['occasion','Aina ya tukio'],['family','Familia'],['invitation','Maandishi ya mwaliko'],['couple','Majina ya wanandoa'],['date','Tarehe'],['details','Taarifa za tukio'],['venue','Mapokezi / eneo'],['message','Ujumbe'],['qr','QR Code'],['brand','Logo ya ForteEvents'],['tagline','Kauli mbiu']];
  const copyFields=[['kicker','Kichwa cha kadi'],['invitationLabel','Neno la Invitation'],['familyLabel','Maneno kabla ya jina la familia'],['invitationIntro','Utangulizi wa mwaliko'],['invitationTitles','Vyeo / heshima kwa mwalikwa'],['eventLine','Sentensi ya mwaliko (tumia {event}, {occasion}, {couple})'],['coupleName','Maandishi ya majina (tumia {bride}, {groom}, {event})'],['venueTitle','Kichwa cha mapokezi'],['contactsTitle','Kichwa cha mawasiliano'],['qrCaption','Maelekezo chini ya QR'],['brandTagline','Kauli mbiu ya ForteEvents'],['footerText','Maandishi ya chini ya kadi']];
  const defaultFields=ECARD_TEMPLATE_FIELDS.filter(([key])=>!['dress_colors','image_url','location_url'].includes(key));
  const load=async()=>{
    setLoading(true);setError('');
    const [uploaded,settings]=await Promise.all([
      supabase.from('e_card_templates').select('*').order('created_at',{ascending:false}),
      supabase.from('e_card_template_settings').select('*')
    ]);
    if(uploaded.error)setError('Sampuli: '+uploaded.error.message);
    if(settings.error)setError('Mipangilio: '+settings.error.message);
    const rows=settings.data||[];
    const all=[...BUILT_IN_ECARD_TEMPLATES,...(uploaded.data||[])];
    const merged=all.map(t=>({...t,adminConfig:rows.find(x=>x.template_id===t.id)?.config||{},adminPublished:rows.find(x=>x.template_id===t.id)?.is_published||false}));
    setTemplates(merged);
    const current=merged.find(t=>t.id===selectedId)||merged[0];
    if(current){setSelectedId(current.id);setConfig({layout:{},copy:{},permissions:{},...(current.adminConfig||{})});setPublished(Boolean(current.adminPublished));}
    setLoading(false);
  };
  useEffect(()=>{load()},[]);
  const choose=id=>{
    const t=templates.find(x=>x.id===id);if(!t)return;
    setSelectedId(id);setConfig({layout:{},copy:{},permissions:{},...(t.adminConfig||{})});setPublished(Boolean(t.adminPublished));setNotice('');setError('');
  };
  const updateLayout=(key,patch)=>setConfig(v=>({...v,layout:{...(v.layout||{}),[key]:{...(v.layout?.[key]||{}),...patch}}}));
  const handleLayoutChange=updater=>setConfig(v=>updater(v));
  const updateCopy=(key,value)=>setConfig(v=>({...v,copy:{...(v.copy||{}),[key]:value}}));
  const updatePermission=(key,value)=>setConfig(v=>({...v,permissions:{...(v.permissions||{}),[key]:value}}));
  const updateDefault=(key,value)=>setConfig(v=>({...v,defaults:{...(v.defaults||{}),[key]:value}}));
  const updateDetailLabel=(key,value)=>setConfig(v=>({...v,copy:{...(v.copy||{}),detailLabels:{...(v.copy?.detailLabels||{}),[key]:value}}}));
  const updateStyle=(key,value)=>setConfig(v=>({...v,style:{...(v.style||{}),[key]:value}}));
  const updateMedia=(key,value)=>setConfig(v=>({...v,media:{...(v.media||{}),[key]:value}}));
  const updateVisibility=(key,value)=>setConfig(v=>({...v,visibility:{...(v.visibility||{}),[key]:value}}));
  const save=async(publish)=>{
    setBusy(true);setError('');setNotice('');
    const {error:saveError}=await supabase.from('e_card_template_settings').upsert({template_id:selectedId,config,is_published:publish,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'template_id'});
    if(saveError)setError('Haikuweza kuhifadhi kiolezo: '+saveError.message);
    else{setPublished(publish);setTemplates(v=>v.map(t=>t.id===selectedId?{...t,adminConfig:config,adminPublished:publish}:t));setNotice(publish?'Kiolezo kimehifadhiwa na kuchapishwa kwa wateja wote.':'Mpangilio umehifadhiwa kama rasimu; wateja bado hawaoni mabadiliko.');}
    setBusy(false);
  };
  const previewCard={occasion:selected?.occasion||'Harusi',title:'JINA LA TUKIO',host_names:'FAMILIA YA MFANO',bride_name:'JINA LA BIBI HARUSI',groom_name:'JINA LA BWANA HARUSI',event_date:'2027-06-20',event_time:'10:00',venue:'UKUMBI WA MFANO',message:'Karibu sana, uwepo wako kwetu ni furaha na heshima kubwa.',...(config.defaults||{}),design:{templateId:selectedId,templateSnapshot:selected,templateConfig:config}};
  return <>
    <div className="page-header"><div><h1>Studio ya Miundo ya E-card</h1><p>Wewe Admin unapanga kadi kuu; wateja wanapata muundo uliouchapisha.</p></div><button className="secondary-button" onClick={onBack}>Rudi Dashboard</button></div>
    {loading?<p>Inapakia miundo...</p>:<>
      {error&&<div className="card ecard-studio-error">{error}</div>}
      {notice&&<div className="card ecard-studio-notice">{notice}</div>}
      <div className="card">
        <label>Chagua kiolezo cha kuhariri</label>
        <select value={selectedId} onChange={e=>choose(e.target.value)}>{templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <p>Hali: <strong>{published?'Kimechapishwa kwa wateja':'Rasimu / hakijachapishwa'}</strong></p>
      </div>
      <div className="ecard-studio-grid">
        <div className="card ecard-studio-preview">
          <h3>Preview ya Admin — buruta vipengele</h3>
          <ECardArtwork key={'admin-studio-'+selectedId} templateId={selectedId} template={selected} card={previewCard} recipientName="JINA LA MWALIKWA" guest={{guest_name:'JINA LA MWALIKWA',invite_type:'single'}} qrUrl="https://forteevents.co.tz/admin-preview" layoutEditor onLayoutChange={handleLayoutChange} onSelectLayoutElement={setSelectedElement}/>
          <p>Chagua kipengele kwenye orodha, kisha kishike na kukivuta kwenye kadi. Mabadiliko yanaonekana papo hapo.</p>
          <div className="ecard-studio-actions"><button className="secondary-button" type="button" onClick={()=>setConfig(v=>({...v,layout:{}}))}>Rudisha nafasi za mwanzo</button><button className="secondary-button" type="button" onClick={()=>setConfig(v=>({...v,layout:{...(v.layout||{}),[selectedElement]:{...(v.layout?.[selectedElement]||{}),scale:1}}}))}>Rudisha ukubwa</button></div>
        </div>
        <div className="card ecard-studio-tools">
          <h3>Vipengele vya kadi</h3>
          <label>Chagua kipengele cha kupanga</label>
          <select value={selectedElement} onChange={e=>setSelectedElement(e.target.value)}>{elements.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
          <label className="ecard-studio-field"><input type="checkbox" checked={config.visibility?.[selectedElement]!==false} onChange={e=>updateVisibility(selectedElement,e.target.checked)}/> Onyesha kipengele hiki kwenye kadi</label>
          <label>Ukubwa wa kipengele</label>
          <input type="range" min="0.5" max="2" step="0.05" value={config.layout?.[selectedElement]?.scale||1} onChange={e=>updateLayout(selectedElement,{scale:Number(e.target.value)})}/>
          <div className="ecard-studio-coordinates"><label>Usogezaji mlalo (%)</label><input type="number" value={Number((config.layout?.[selectedElement]?.dx||0).toFixed(1))} onChange={e=>updateLayout(selectedElement,{dx:Number(e.target.value)||0})}/><label>Usogezaji wima (%)</label><input type="number" value={Number((config.layout?.[selectedElement]?.dy||0).toFixed(1))} onChange={e=>updateLayout(selectedElement,{dy:Number(e.target.value)||0})}/></div>
          <h3>Maandishi ya kudumu ya kiolezo</h3>
          {copyFields.map(([key,label])=><label className="ecard-studio-field" key={key}>{label}<input value={config.copy?.[key]||''} onChange={e=>updateCopy(key,e.target.value)} placeholder="Acha wazi kutumia maandishi ya kawaida"/></label>)}
          <h3>Taarifa za mwanzo za kadi</h3>
          <p>Andika maneno ya msingi yatakayoonekana kabla mteja hajaanza kuhariri. Sehemu fixed zitabaki na taarifa hizi.</p>
          {defaultFields.map(([key,label])=><label className="ecard-studio-field" key={key}>{label}<input value={config.defaults?.[key]||''} onChange={e=>updateDefault(key,e.target.value)} placeholder="Taarifa ya mwanzo (hiari)"/></label>)}
          <h3>Picha na utambulisho</h3>
          <label className="ecard-studio-field">Link ya picha ya mandhari (https://)<input value={config.media?.backgroundUrl||''} onChange={e=>updateMedia('backgroundUrl',e.target.value)} placeholder="Acha wazi kutumia picha ya sasa"/></label>
          <label className="ecard-studio-field">Link ya logo (https://)<input value={config.media?.logoUrl||''} onChange={e=>updateMedia('logoUrl',e.target.value)} placeholder="Acha wazi kutumia logo ya ForteEvents"/></label>
          <h3>Rangi na fonti ya kiolezo</h3>
          <label className="ecard-studio-field">Rangi ya msingi <input type="color" value={config.style?.accent||'#a77b20'} onChange={e=>updateStyle('accent',e.target.value)}/></label>
          <label className="ecard-studio-field">Rangi ya maandishi <input type="color" value={config.style?.text||'#252018'} onChange={e=>updateStyle('text',e.target.value)}/></label>
          <label className="ecard-studio-field">Fonti <select value={config.style?.font||'Georgia, serif'} onChange={e=>updateStyle('font',e.target.value)}><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="'Times New Roman', serif">Times New Roman</option><option value="Verdana, sans-serif">Verdana</option><option value="cursive">Cursive</option></select></label>
          <h3>Majina ya sehemu za taarifa</h3>
          {['TAREHE','MUDA','IBADA','MAPOKEZI','MAHALI','CHAKULA','DRESS CODE','RSVP'].map(key=><label className="ecard-studio-field" key={key}>{key}<input value={config.copy?.detailLabels?.[key]||key} onChange={e=>updateDetailLabel(key,e.target.value)}/></label>)}
          <h3>Majina ya sehemu za taarifa</h3>
          {['TAREHE','MUDA','IBADA','MAPOKEZI','MAHALI','CHAKULA','DRESS CODE','RSVP'].map(key=><label className="ecard-studio-field" key={key}>{key}<input value={config.copy?.detailLabels?.[key]||key} onChange={e=>updateDetailLabel(key,e.target.value)}/></label>)}
          <h3>Ruhusa za mteja</h3>
          <p>Weka tiki kwenye taarifa ambazo mteja anaruhusiwa kubadilisha. Zisizo na tiki zitakuwa fixed.</p>
          <div className="ecard-studio-permissions">{ECARD_TEMPLATE_FIELDS.map(([key,label])=><label key={key}><input type="checkbox" checked={config.permissions?.[key]!==false} onChange={e=>updatePermission(key,e.target.checked)}/>{label}</label>)}</div>
          <h3>Vipengele visivyoguswa na mteja</h3>
          <p>QR Code, logo, kauli mbiu na mpangilio wa michoro vinadhibitiwa na Admin; mteja hawezi kuvivuta.</p>
          <button className="primary-button" type="button" disabled={busy} onClick={()=>save(false)}>{busy?'Inahifadhi...':'Hifadhi rasimu'}</button>
          <button className="primary-button" type="button" disabled={busy} onClick={()=>save(true)}>Hifadhi na chapisha kwa wateja</button>
        </div>
      </div>
    </>}
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
  const [showPassword, setShowPassword] = useState(false)
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
  const [selectedTemplateId, setSelectedTemplateId] = useState('forte-ivory-gold-rose')
  const [ecardTemplateSettings,setEcardTemplateSettings]=useState({})
  const selectedECardTemplateBase = [...BUILT_IN_ECARD_TEMPLATES, ...ecardTemplates].find(item => item.id === selectedTemplateId) || BUILT_IN_ECARD_TEMPLATES[0]
  const selectedECardTemplate = {...selectedECardTemplateBase,templateConfig:ecardTemplateSettings[selectedTemplateId]?.config||{},templatePublished:Boolean(ecardTemplateSettings[selectedTemplateId]?.is_published)}
  const canEditTemplateField = key => selectedECardTemplate?.templateConfig?.permissions?.[key] !== false
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
      const [{data,error},{data:settings,error:settingsError}] = await Promise.all([supabase.from('e_card_templates').select('id,name,occasion,description,image_url,theme,design').eq('is_active', true).order('created_at', { ascending: false }),supabase.from('e_card_template_settings').select('template_id,config,is_published').eq('is_published',true)])
      if (!active) return
      if (error) setECardMessage('Sampuli za E-card hazijapakiwa: ' + error.message)
      else setEcardTemplates(data || [])
      if(settingsError) setECardMessage('Mipangilio ya kiolezo haijapakiwa: '+settingsError.message)
      else setEcardTemplateSettings(Object.fromEntries((settings||[]).map(row=>[row.template_id,row])))
      setEcardTemplatesLoading(false)
    }
    loadTemplates()
    return () => { active = false }
  }, [page])

  useEffect(()=>{
    if(page!=='ecard')return
    const defaults=ecardTemplateSettings[selectedTemplateId]?.config?.defaults
    if(defaults&&Object.keys(defaults).length)setECardForm(v=>({...v,...defaults}))
  },[page,selectedTemplateId,ecardTemplateSettings])

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
      const {data:publishedSettings}=await supabase.from('e_card_template_settings').select('template_id,config').eq('is_published',true)
      const settingsById=Object.fromEntries((publishedSettings||[]).map(row=>[row.template_id,row.config]))
      const cards=(data||[]).map(card=>{
        const templateId=getSavedECardTemplateId(card)
        const config=settingsById[templateId]
        return config ? {...card,design:{...getECardDesignData(card),templateConfig:config}} : card
      })
      setECards(cards)
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
    setSelectedTemplateId('forte-ivory-gold-rose')
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
        design: { ...defaultECardDesign, templateId: selectedECardTemplate?.id || selectedTemplateId, templateConfig: selectedECardTemplate?.templateConfig || {}, templateSnapshot: { ...selectedECardTemplate, id: selectedECardTemplate?.id || selectedTemplateId, templateConfig:selectedECardTemplate?.templateConfig||{}, name: selectedECardTemplate?.name || getECardTemplate(selectedTemplateId)?.name || 'ForteEvents E-card', occasion: selectedECardTemplate?.occasion || eCardForm.occasion, style: selectedECardTemplate?.style || selectedECardTemplate?.design?.style || getECardTemplate(selectedTemplateId)?.style || 'ivory-gold', artwork: selectedECardTemplate?.artwork || selectedECardTemplate?.image_url || selectedECardTemplate?.design?.artwork || getECardTemplate(selectedTemplateId)?.artwork, aspectRatio: selectedECardTemplate?.aspectRatio || '5 / 7', photoSlot: Boolean(selectedECardTemplate?.photoSlot) } },
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
      setECardMessage('E-card imehifadhiwa. Template: '+(selectedECardTemplate?.name || getECardTemplate(selectedTemplateId)?.name)+'. Kadi hii sasa ndiyo itatumika kwenye PNG, WhatsApp na uchapishaji.')
      setGuestCardId(data.id)
      resetECardForm()
      await Promise.all([loadECards(),loadECardGuests(data.id)])
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
    setSelectedTemplateId(getSavedECardTemplateId(card)==='forte-white-gold'?'forte-ivory-gold-rose':getSavedECardTemplateId(card)==='forte-cream-blue'?'forte-blue-rose':getSavedECardTemplateId(card))
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

  const deleteECardGuest = async (guest) => {
    if (!guest?.id || !guestCardId) return
    if (!window.confirm('Una uhakika unataka kufuta mwaliko wa ' + guest.guest_name + '? Kadi ya tukio yenyewe haitafutwa.')) return
    setGuestBusy(true)
    const { error } = await supabase.from('e_card_guests')
      .delete().eq('id', guest.id).eq('card_id', guestCardId)
    if (error) {
      setECardMessage('Imeshindikana kufuta mwaliko wa mgeni: ' + error.message)
    } else {
      setECardMessage('Mwaliko wa ' + guest.guest_name + ' umefutwa.')
      await loadECardGuests(guestCardId)
    }
    setGuestBusy(false)
  }

  const checkInECardGuest = async (rawToken) => {
    let token = String(rawToken || '').trim()
    if (!token) { setScanResult('Weka au scan QR token kwanza.'); return }
    try {
      const parsed = new URL(token)
      token = parsed.searchParams.get('guest') || token
    } catch {}
    const uuidMatch = token.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)
    if (uuidMatch) token = uuidMatch[0]
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
      setScanResult('QR haijasomeka vizuri. Hakikisha unascan QR ya mwaliko wa mgeni, si link ya kadi ya jumla.')
      return
    }
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
      const scanner = new Html5Qrcode('ecard-qr-reader', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
      scanVideoRef.current = scanner
      let handled = false
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        async decodedText => {
          if (handled) return
          handled = true
          setScannerActive(false)
          try { await scanner.stop() } catch {}
          try { await scanner.clear() } catch {}
          scanVideoRef.current = null
          await checkInECardGuest(decodedText)
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
      if (!error && data) {
        const templateId=getSavedECardTemplateId(data)
        const {data:publishedSetting}=await supabase.from('e_card_template_settings').select('config,is_published').eq('template_id',templateId).eq('is_published',true).maybeSingle()
        if(publishedSetting?.config) data.design={...getECardDesignData(data),templateConfig:publishedSetting.config}
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
              <ECardArtwork key={'public-card-'+publicECard.id+'-'+getSavedECardTemplateId(publicECard)} templateId={getSavedECardTemplateId(publicECard)} card={publicECard} guest={publicECard.guest || null} recipientName={publicECard.guest?.guest_name || '[JINA LA MWALIKWA]'} qrUrl={window.location.origin + window.location.pathname + '?card=' + encodeURIComponent(new URLSearchParams(window.location.search).get('card')) + (publicECard.guest?.token ? '&guest=' + encodeURIComponent(publicECard.guest.token) : '')}/>
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

            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
              <button
                type="button"
                className="password-visibility-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Ficha password' : 'Onyesha password'}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Ficha' : '👁'}
              </button>
            </div>

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
            <button className={adminPage === 'ecard-studio' ? 'nav-button active' : 'nav-button'} onClick={() => setAdminPage('ecard-studio')}>Studio ya E-card</button>
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
                  <h3>Studio ya E-card</h3><p>Hariri muonekano wa kadi, maandishi ya kudumu na ruhusa za sehemu ambazo wateja wanaweza kubadilisha.</p><button className="primary-button" onClick={() => setAdminPage('ecard-studio')}>Fungua Studio</button>
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
{adminPage === 'ecard-studio' && <AdminECardTemplateStudio session={session} onBack={() => setAdminPage('dashboard')} />}
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
          <div className="card ecard-template-picker">
            <div className="ecard-picker-heading"><h2>Chagua kadi unayoipenda</h2><p>Angalia muonekano wa kila sampuli, chagua moja, kisha jaza taarifa zako. Mapambo na mpangilio wa muundo hubaki kama ulivyo.</p></div>
            {ecardTemplatesLoading ? <p>Inapakia sampuli za ziada...</p> : null}
            {eCardMessage && eCardMessage.startsWith('Sampuli za E-card hazijapakiwa:') && <p className="ecard-form-hint">{eCardMessage}</p>}
            <div className="ecard-choice-grid">
              {BUILT_IN_ECARD_TEMPLATES.map(item => <div
                key={item.id}
                className={"ecard-choice-card ecard-choice-card-live "+(selectedTemplateId===item.id?'selected':'')}
                role="button"
                tabIndex={0}
                onClick={()=>setSelectedTemplateId(item.id)}
                onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedTemplateId(item.id)}}}
                aria-pressed={selectedTemplateId===item.id}
                aria-label={"Chagua sampuli "+item.name}
              >
                <div className="ecard-choice-preview-window">
                  <ECardArtwork
                    key={'template-thumb-'+item.id}
                    templateId={item.id}
                    card={{occasion:item.occasion,title:item.name,host_names:'FAMILIA YAKO',bride_name:'JINA LA BIBI HARUSI',groom_name:'JINA LA BWANA HARUSI',message:DEFAULT_ECARD_MESSAGE,design:{templateId:item.id}}}
                    recipientName="[JINA LA MWALIKWA]"
                    guest={{guest_name:'JINA LA MWALIKWA',invite_type:'single'}}
                    qrUrl={window.location.origin+'/?ecard-template='+encodeURIComponent(item.id)}
                  />
                </div>
                <strong>{item.name}</strong><small>{item.description}</small>{selectedTemplateId===item.id&&<em>Imechaguliwa</em>}
              </div>)}
              {ecardTemplates.map(item => <button type="button" key={item.id} className={"ecard-choice-card "+(selectedTemplateId===item.id?'selected':'')} onClick={()=>setSelectedTemplateId(item.id)} aria-pressed={selectedTemplateId===item.id}>
                <img className="ecard-choice-uploaded" src={item.image_url} alt={"Sampuli "+item.name}/><strong>{item.name}</strong><small>{item.description || item.occasion}</small>{selectedTemplateId===item.id&&<em>Imechaguliwa</em>}
              </button>)}
            </div>
          </div>
          <div className="card">
            <h2>{editingECardId ? 'Hariri E-card' : 'Tengeneza E-card mpya'}</h2>
            <div className="ecard-sample-first-intro">
              <h2>Kadi ya mfano — hariri taarifa zake</h2>
              <p>Hii ndiyo kadi ambayo mteja atatumia. Badilisha taarifa kwenye sehemu zilizo chini; muonekano wa kadi utajisasisha papo hapo.</p>
            </div>
            <ECardArtwork key={'live-preview-'+selectedTemplateId} templateId={selectedTemplateId} template={selectedECardTemplate} card={{...eCardForm,design:{templateId:selectedTemplateId,templateConfig:selectedECardTemplate?.templateConfig||{},templateSnapshot:{...selectedECardTemplate,templateConfig:selectedECardTemplate?.templateConfig||{}}}}} recipientName={guestName.trim() || '[JINA LA MWALIKWA]'} guest={{guest_name:guestName.trim() || 'JINA LA MWALIKWA',invite_type:guestType}} qrUrl={window.location.origin + '/?ecard-preview=forteevents'}/>
            <form onSubmit={saveECard}>
              <label>Jina la tukio</label>
              <input value={eCardForm.title} disabled={!canEditTemplateField('title')} onChange={e => setECardForm(v => ({...v, title:e.target.value}))} placeholder="Mfano: Harusi ya John na Mary" required />
              <label>Aina ya tukio</label>
              <select value={eCardForm.occasion} disabled={!canEditTemplateField('occasion')} onChange={e => setECardForm(v => ({...v, occasion:e.target.value}))}>
                <option>Harusi</option><option>Send-off</option><option>Kipaimara</option><option>Graduation</option><option>Birthday</option><option>Kitchen Party</option><option>Shukrani</option><option>Kupongeza</option><option>Kumuaga</option><option>Tukio lingine</option>
              </select>
              <label>Jina la familia inayoalika</label>
              <input value={eCardForm.host_names} disabled={!canEditTemplateField('host_names')} onChange={e => setECardForm(v => ({...v, host_names:e.target.value}))} placeholder="Mfano: Bwana na Bi. Amini Mlashi" />
              <label>Tarehe</label>
              <input type="date" value={eCardForm.event_date} disabled={!canEditTemplateField('event_date')} onChange={e => setECardForm(v => ({...v, event_date:e.target.value}))} required />
              <label>Muda wa tukio</label>
              <input type="time" value={eCardForm.event_time} disabled={!canEditTemplateField('event_time')} onChange={e => setECardForm(v => ({...v, event_time:e.target.value}))} />
              <label>Jina la bibi harusi</label>
              <input value={eCardForm.bride_name} disabled={!canEditTemplateField('bride_name')} onChange={e => setECardForm(v => ({...v, bride_name:e.target.value}))} />
              <label>Jina la bwana harusi</label>
              <input value={eCardForm.groom_name} disabled={!canEditTemplateField('groom_name')} onChange={e => setECardForm(v => ({...v, groom_name:e.target.value}))} />
              <label>Muda wa ibada</label>
              <input type="time" value={eCardForm.ceremony_time} disabled={!canEditTemplateField('ceremony_time')} onChange={e => setECardForm(v => ({...v, ceremony_time:e.target.value}))} />
              <label>Mahali pa ibada</label>
              <input value={eCardForm.ceremony_venue} disabled={!canEditTemplateField('ceremony_venue')} onChange={e => setECardForm(v => ({...v, ceremony_venue:e.target.value}))} />
              <label>Muda wa reception</label>
              <input type="time" value={eCardForm.reception_time} disabled={!canEditTemplateField('reception_time')} onChange={e => setECardForm(v => ({...v, reception_time:e.target.value}))} />
              <label>Mahali pa reception</label>
              <input value={eCardForm.reception_venue} disabled={!canEditTemplateField('reception_venue')} onChange={e => setECardForm(v => ({...v, reception_venue:e.target.value}))} />
              <label>Ujumbe wa chakula / mapokezi</label>
              <input value={eCardForm.food_note} disabled={!canEditTemplateField('food_note')} onChange={e => setECardForm(v => ({...v, food_note:e.target.value}))} />
              <label>Maelezo ya dress code (hiari)</label>
              <input value={eCardForm.dress_code} disabled={!canEditTemplateField('dress_code')} onChange={e => setECardForm(v => ({...v, dress_code:e.target.value}))} placeholder="Mfano: Vazi rasmi" />
              <label>Chagua rangi za dress code (hadi 3)</label>
              <div className="ecard-color-picker">{ECARD_DRESS_PALETTE.map(color => { const active=(eCardForm.dress_colors||[]).includes(color.value); return <button type="button" key={color.value} className={"ecard-color-choice "+(active?'active':'')} disabled={!canEditTemplateField('dress_colors')} onClick={()=>setECardForm(v=>({...v,dress_colors:active?v.dress_colors.filter(x=>x!==color.value):v.dress_colors.length<3?[...v.dress_colors,color.value]:v.dress_colors}))} aria-label={color.label} title={color.label} aria-pressed={active}><i style={{backgroundColor:color.hex}}/><span>{color.label}</span></button>})}</div>
              <p className="ecard-form-hint">Rangi zilizochaguliwa zitaonekana kwenye kadi kama alama za rangi, bila majina marefu.</p>
              <label>Tarehe ya mwisho ya RSVP</label>
              <input type="date" value={eCardForm.rsvp_deadline} disabled={!canEditTemplateField('rsvp_deadline')} onChange={e => setECardForm(v => ({...v, rsvp_deadline:e.target.value}))} />
              <label>Jina la mawasiliano 1</label>
              <input value={eCardForm.rsvp_contact_name} disabled={!canEditTemplateField('rsvp_contact_name')} onChange={e => setECardForm(v => ({...v, rsvp_contact_name:e.target.value}))} />
              <label>Simu ya mawasiliano 1</label>
              <input value={eCardForm.rsvp_contact_phone} disabled={!canEditTemplateField('rsvp_contact_phone')} onChange={e => setECardForm(v => ({...v, rsvp_contact_phone:e.target.value}))} />
              <label>Jina la mawasiliano 2</label>
              <input value={eCardForm.rsvp_contact_name_2} disabled={!canEditTemplateField('rsvp_contact_name_2')} onChange={e => setECardForm(v => ({...v, rsvp_contact_name_2:e.target.value}))} />
              <label>Simu ya mawasiliano 2</label>
              <input value={eCardForm.rsvp_contact_phone_2} disabled={!canEditTemplateField('rsvp_contact_phone_2')} onChange={e => setECardForm(v => ({...v, rsvp_contact_phone_2:e.target.value}))} />
              <label>Mahali / Ukumbi</label>
              <input value={eCardForm.venue} disabled={!canEditTemplateField('venue')} onChange={e => setECardForm(v => ({...v, venue:e.target.value}))} placeholder="Jina la ukumbi na eneo" />
              <label>Google Maps location link (hiari)</label>
              <input type="url" value={eCardForm.location_url} disabled={!canEditTemplateField('location_url')} onChange={e => setECardForm(v => ({...v, location_url:e.target.value}))} placeholder="Bandika link ya Google Maps ya ukumbi" />
              <p style={{fontSize:'13px'}}>Fungua eneo kwenye Google Maps, bonyeza Share, kisha Copy link na ubandike hapa.</p>
              <label>Ujumbe wa Familia</label>
              <textarea rows="4" value={eCardForm.message} disabled={!canEditTemplateField('message')} onChange={e => setECardForm(v => ({...v, message:e.target.value}))} placeholder="Karibu sana, uwepo wako kwetu ni furaha na heshima kubwa. Tunatazamia kusherehekea nawe siku hii ya pekee." />
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
              <input type="url" value={eCardForm.image_url} disabled={!canEditTemplateField('image_url')} onChange={e => setECardForm(v => ({...v, image_url:e.target.value}))} placeholder="https://..." />
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
              const guestUrl = g.token
              return <div key={g.id} className="ecard-guest-print ecard-guest-sheet">
                <ECardArtwork
                  card={card}
                  guest={g}
                  recipientName={g.guest_name}
                  qrUrl={guestUrl}
                />
                <div className="no-print ecard-guest-actions"><span>{g.checked_in_at ? 'Ameingia' : 'Bado hajaingia'}</span><button type="button" className="secondary-button" onClick={async()=>{try{const png=await createECardPng({...card},g);downloadECardPng(png,'ForteEvents-'+g.guest_name.replace(/[^a-z0-9]/gi,'-')+'.png')}catch(error){setECardMessage(error.message)}}}>Pakua PNG</button><ECardImageShareButton card={card} guest={g} onMessage={setECardMessage} label="Shiriki picha WhatsApp"/><button type="button" className="secondary-button" onClick={()=>window.print()}>Chapisha</button><button type="button" className="danger-button no-print" onClick={() => deleteECardGuest(g)} disabled={guestBusy} aria-label={'Futa mwaliko wa '+g.guest_name}>🗑 Futa mwaliko huu</button></div>
              </div>
            })}
          </div>
          <div className="card" style={{marginTop:'20px'}}>
            <h2>Kadi Zangu</h2>
            {eCardsLoading ? <p>Inapakia...</p> : eCards.length === 0 ? <p>Bado hujatengeneza E-card.</p> : eCards.map(card => (
              <div key={card.id} style={{border:'1px solid #d6bd78',borderRadius:'10px',padding:'16px',marginBottom:'12px'}}>
                <h3>{card.title}</h3><p>{card.occasion} · {card.event_date}</p><p><strong>Template:</strong> {getSavedECardTemplate(card)?.name || 'Ivory & Gold Roses'}</p>
                <p><strong>Hali:</strong> {card.is_published ? 'Imechapishwa' : 'Haijachapishwa'}</p>
                <button type="button" className="secondary-button" onClick={() => editECard(card)}>Hariri</button>{' '}
                <button type="button" className="secondary-button" onClick={async()=>{try{const png=await createECardPng(card);downloadECardPng(png,'ForteEvents-'+String(card.title||'mwaliko').replace(/[^a-z0-9]/gi,'-')+'.png');setECardMessage('Kadi imepakuliwa kama PNG.')}catch(error){setECardMessage('Imeshindikana kupakua kadi: '+(error?.message||'Jaribu tena.'))}}}>Pakua PNG</button>{' '}
                <ECardImageShareButton card={card} onMessage={setECardMessage} label="Shiriki picha WhatsApp"/>{' '}
                <button type="button" className="secondary-button" onClick={() => toggleECardPublished(card)}>{card.is_published ? 'Ficha link' : 'Chapisha / Washa link'}</button>{' '}
                <button type="button" className="danger-button" onClick={() => deleteECard(card)} aria-label={'Futa kadi '+card.title}>🗑 Futa kadi</button>
                {card.is_published && <>
                  <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'12px'}}>
                    <button type="button" className="primary-button" onClick={() => shareECard(card, 'link', setECardMessage)}>WhatsApp — Link</button>
                    <button type="button" className="secondary-button" onClick={() => window.print()}>Chapisha</button>
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