import { useRef,useState } from 'react'

export default function ECardStudioObjects({objects=[],layoutEditor=false,selectedObjectId=null,onSelect,onChange,onBeginChange}) {
  const dragRef=useRef(null)
  const [editingId,setEditingId]=useState(null)
  const update=(id,patch)=>onChange?.(items=>items.map(item=>item.id===id?{...item,...patch}:item))
  const finishText=(id,value)=>{update(id,{text:value});setEditingId(null)}
  const move=event=>{
    const d=dragRef.current;if(!d||!layoutEditor)return
    const rect=event.currentTarget.getBoundingClientRect()
    const dx=(event.clientX-d.clientX)/rect.width*100,dy=(event.clientY-d.clientY)/rect.height*100
    if(d.mode==='resize')update(d.id,{width:Math.max(3,Math.min(100-d.x,d.width+dx)),height:Math.max(2,Math.min(100-d.y,d.height+dy))})
    else update(d.id,{x:Math.max(0,Math.min(100-d.width,d.x+dx)),y:Math.max(0,Math.min(100-d.height,d.y+dy))})
  }
  const stop=()=>{dragRef.current=null}
  return <div className='ecard-free-objects' onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
    {(objects||[]).filter(item=>item&&item.visible!==false).map(item=>{
      const selected=layoutEditor&&selectedObjectId===item.id
      const locked=item.locked===true
      const width=item.width??40,height=item.height??12,x=item.x??30,y=item.y??30
      const style={left:x+'%',top:y+'%',width:width+'%',height:height+'%',zIndex:item.zIndex??20,opacity:item.opacity??1,transform:'rotate('+(item.rotation||0)+'deg)',color:item.color||'#252018',fontFamily:item.fontFamily||'Georgia, serif',fontSize:(item.fontSize||3.5)+'cqw',fontWeight:item.fontWeight||400,textAlign:item.textAlign||'left',lineHeight:1.2,background:item.type==='shape'?(item.fill||'transparent'):'transparent',border:item.type==='shape'?(item.borderWidth||0)+'px solid '+(item.borderColor||'#c69a32'):'none',borderRadius:(item.radius||0)+'px'}
      return <div key={item.id} className={'ecard-free-object ecard-free-object-'+item.type+(selected?' is-selected':'')+(locked?' is-locked':'')} style={style} onPointerDown={event=>{if(!layoutEditor||editingId===item.id)return;event.preventDefault();event.stopPropagation();onSelect?.(item.id);if(locked)return;onBeginChange?.();event.currentTarget.setPointerCapture?.(event.pointerId);dragRef.current={id:item.id,mode:'move',clientX:event.clientX,clientY:event.clientY,x,y,width,height}}}>
        {item.type==='image'?<img src={item.src} alt={item.name||'Picha ya mapambo'} draggable='false'/>:item.type==='shape'?null:item.type==='flower'?<svg viewBox='0 0 100 100' aria-label='Ua la mapambo' style={{width:'100%',height:'100%',display:'block'}}><g fill={item.color||'#d9a6b3'} stroke={item.borderColor||'#9d6d34'} strokeWidth='1.5'>{Array.from({length:8},(_,i)=><ellipse key={i} cx='50' cy='24' rx='12' ry='23' transform={'rotate('+(i*45)+' 50 50)'}/>)}</g><circle cx='50' cy='50' r='13' fill={item.centerColor||'#d5a53b'}/><circle cx='50' cy='50' r='5' fill='#fff1b8'/></svg>:<div className='ecard-free-object-text' contentEditable={layoutEditor&&editingId===item.id} suppressContentEditableWarning onDoubleClick={event=>{if(layoutEditor){event.stopPropagation();setEditingId(item.id);event.currentTarget.focus()}}} onBlur={event=>{if(editingId===item.id)finishText(item.id,event.currentTarget.innerText)}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.currentTarget.blur()} if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.blur()}}}>{item.text||''}</div>}
        {selected&&!locked&&<span className='ecard-free-object-resize' title='Badilisha ukubwa' onPointerDown={event=>{event.preventDefault();event.stopPropagation();onBeginChange?.();event.currentTarget.setPointerCapture?.(event.pointerId);dragRef.current={id:item.id,mode:'resize',clientX:event.clientX,clientY:event.clientY,x,y,width,height}}}/>}
      </div>
    })}
  </div>
}