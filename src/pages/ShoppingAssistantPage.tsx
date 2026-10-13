import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Mic, Paperclip, Send, Sparkles, X, Plus, Scale, Search, Package, RotateCcw, Heart, Loader2 } from 'lucide-react'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import AssistantDiscovery from '@/components/AssistantDiscovery'
import SEO from '@/components/SEO'
import { fetchSearchSuggestions, fetchWooProductBySlug, searchProductsByImage, type SearchSuggestionProduct, type WooProduct } from '@/lib/woocommerce'
import { prepareImageSearchFile, createImageSearchPreview, isVideoAttachment } from '@/lib/imageSearch'
import { useCartStore } from '@/store/cartStore'
import { normalizeAssistantReply, readAssistantResponse, resolveAssistantContext, normalizeConversations, saveConversation, deleteConversation, type AssistantConversation, type ChatTurn, canConfirmAssistantCart, type AssistantProduct, type AssistantReply } from '@/lib/shoppingAssistant'
import { ACCOUNT_STATE_CLEARED_EVENT } from '@/lib/marketplaceBrowserState'
import './shopping-assistant.css'

type Turn = ChatTurn
type Job = 'find' | 'compare' | 'track' | 'return' | 'value'
type Voice = {start:()=>void; stop:()=>void; onresult:((event:{results:{[index:number]:{[index:number]:{transcript:string}}}})=>void)|null; onerror:(()=>void)|null; onend:(()=>void)|null; lang:string; interimResults:boolean}
const jobs = [{key:'find',label:'Find products',icon:Search},{key:'compare',label:'Compare',icon:Scale},{key:'track',label:'Track order',icon:Package},{key:'return',label:'Returns',icon:RotateCcw},{key:'value',label:'Help me decide',icon:Heart}] as const
const SESSION = 'digitalhood-ai-session-v1'
const CHATS = 'digitalhood-ai-conversations-v2'
const MEMORY = SESSION+'-enabled'
const PREFS = 'digitalhood-ai-preferences-v1'
const money = (n:number) => new Intl.NumberFormat('en-ZM',{style:'currency',currency:'ZMW'}).format(n)
  function ProductCard({product,selected,cartBusy,draft,toggleCompare,prepareCart}:{product:AssistantProduct;selected:AssistantProduct[];cartBusy:boolean;draft:(text:string,ids?:number[])=>void;toggleCompare:(p:AssistantProduct)=>void;prepareCart:(p:AssistantProduct)=>Promise<void>}){return <article className="ai-product">
    <Link to={new URL(product.url).pathname} className="ai-photo"><img src={product.image} alt="" width={240} height={160} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={e=>{if(e.currentTarget.getAttribute('src')!=='/product-placeholder.svg')e.currentTarget.src='/product-placeholder.svg'}}/></Link>
    <div className="ai-product-body"><Link to={new URL(product.url).pathname} className="ai-name">{product.name}</Link><strong>{money(product.price)}</strong>
      <small>{product.sellerStoreName || 'Seller details on listing'}</small><small>{product.ratingCount && product.averageRating != null ? `${product.averageRating.toFixed(1)} / 5 · ${product.ratingCount} ratings`:'No rating information'}</small><small>{product.stockLabel || (product.stockStatus==='instock'?'In stock at last catalogue check':'Check availability')}</small><small>Delivery & fees: check at checkout</small>
      <div className="ai-actions"><button type="button" onClick={()=>draft('Tell me about '+product.name,[product.id])}>Ask about it</button><button type="button" aria-label={'Compare '+product.name} aria-pressed={selected.some(p=>p.id===product.id)} onClick={()=>toggleCompare(product)}><Scale size={16}/></button></div>
      <div className="ai-actions">{product.canAddToCart===true?<button type="button" disabled={cartBusy} onClick={()=>void prepareCart(product)}>Add to cart</button>:<Link to={new URL(product.url).pathname}>Check options <ArrowRight size={14}/></Link>}<a href={product.url}>Source</a></div>
    </div>
  </article>}

export default function ShoppingAssistantPage() {
  const location = useLocation()
  const [message,setMessage] = useState<string>(typeof location.state?.question === 'string' ? location.state.question.slice(0,500) : '')
  const [chats,setChats]=useState<AssistantConversation[]>([])
  const [activeChat,setActiveChat]=useState<string>(()=>crypto.randomUUID())
  const [showHistory,setShowHistory]=useState(false)
  const [photoPreview,setPhotoPreview]=useState('')
  const [turns,setTurns] = useState<Turn[]>([])
  const [job,setJob] = useState<Job>('find')
  const [busy,setBusy] = useState(false)
  const [preview,setPreview] = useState('')
  const [pendingQuestion,setPendingQuestion] = useState('')
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [suggestions,setSuggestions] = useState<SearchSuggestionProduct[]>([])
  const [focused,setFocused] = useState(false)
  const [selected,setSelected] = useState<AssistantProduct[]>([])
  const [showComparison,setShowComparison] = useState(false)
  const [pendingCart,setPendingCart] = useState<WooProduct|null>(null)
  const [cartBusy,setCartBusy] = useState(false)
  const [cartReview,setCartReview] = useState(false)
  const [photo,setPhoto] = useState<File|null>(null)
  const [photoBusy,setPhotoBusy] = useState(false)
  const headerFrame = useRef<HTMLDivElement>(null)
  const [viewportHeight,setViewportHeight] = useState<number|null>(null)
  const [contextIds,setContextIds] = useState<number[]>([])
  const [hydrated,setHydrated] = useState(false)
  const [browseDiscovery,setBrowseDiscovery]=useState(false)
  const [compactDiscovery,setCompactDiscovery] = useState(window.innerWidth<=1100)
  const [remember,setRemember] = useState(true)
  const [showPrefs,setShowPrefs] = useState(false)
  const [budget,setBudget] = useState('')
  const [size,setSize] = useState('')
  const [savedPrefs,setSavedPrefs] = useState<{budget:string;size:string}|null>(null)
  const [voiceNotice,setVoiceNotice] = useState(false)
  const [listening,setListening] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const active = useRef<AbortController|null>(null)
  const voice = useRef<Voice|null>(null)
  const requestId = useRef(0)
  const cartRequest = useRef(0)
  const items = useCartStore(s=>s.items)
  const addItem = useCartStore(s=>s.addItem)
  const [shown,setShown] = useState(6)

  useEffect(()=>{
    const viewport=window.visualViewport
    const resize=()=>{setCompactDiscovery(window.innerWidth<=1100);setViewportHeight(Math.max(240,Math.round((viewport?.height || window.innerHeight)-(headerFrame.current?.getBoundingClientRect().height || 0))))}
    const observer=new ResizeObserver(resize);if(headerFrame.current)observer.observe(headerFrame.current)
    resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize)
    return ()=>{observer.disconnect();viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize)}
  },[])
  useEffect(()=>{
    try {
      const stored = JSON.parse(localStorage.getItem(PREFS) || 'null')
      if (stored && typeof stored.budget === 'string' && typeof stored.size === 'string') {setSavedPrefs({budget:stored.budget.slice(0,12),size:stored.size.slice(0,40)});setBudget(stored.budget.slice(0,12));setSize(stored.size.slice(0,40))}
      setRemember(sessionStorage.getItem(MEMORY)!=='false')
      const storedChats=JSON.parse(sessionStorage.getItem(CHATS) || 'null')
      const legacy=JSON.parse(sessionStorage.getItem(SESSION) || 'null')
      const restored=normalizeConversations(storedChats?.chats || (Array.isArray(legacy)?[{id:'legacy-chat',turns:legacy,updated:Date.now()}]:[]))
      setChats(restored)
      const current=storedChats?.active?restored.find(c=>c.id===storedChats.active):restored[0]
      if(current){setActiveChat(current.id);setTurns(current.turns)}else if(typeof storedChats?.active==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(storedChats.active))setActiveChat(storedChats.active)
      sessionStorage.removeItem(SESSION)
    } catch { /* Storage may be unavailable. */ }
    setHydrated(true)
    const clear = ()=>{setChats([]);setActiveChat(crypto.randomUUID());setPhotoPreview('');setShowHistory(false);requestId.current++;cartRequest.current++;active.current?.abort();if(voice.current){voice.current.onresult=null;voice.current.onend=null;voice.current.onerror=null;voice.current.stop();voice.current=null}setTurns([]);setPendingCart(null);setSelected([]);setSavedPrefs(null);setBudget('');setSize('');setRemember(false);setListening(false);setVoiceNotice(false);setPhotoBusy(false);setContextIds([]);setBusy(false);setPreview('');setPhoto(null);setMessage('');setCartReview(false);try{localStorage.removeItem(PREFS);sessionStorage.removeItem(SESSION);sessionStorage.removeItem(MEMORY);sessionStorage.removeItem(CHATS)}catch{}}
    window.addEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear)
    return ()=>{window.removeEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear);requestId.current++;cartRequest.current++;active.current?.abort();if(voice.current){voice.current.onresult=null;voice.current.onend=null;voice.current.onerror=null;voice.current.stop()}}
  },[])
  useEffect(()=>{if(!hydrated)return;const next=saveConversation(chats,activeChat,turns,Date.now());if(turns.length)setChats(next);try{sessionStorage.setItem(MEMORY,String(remember));if(remember)sessionStorage.setItem(CHATS,JSON.stringify({active:activeChat,chats:next}));else sessionStorage.removeItem(CHATS)}catch{setNotice('Chat history could not be saved in this browser. Delete unneeded chats or free browser storage.')}},[turns,remember,hydrated,activeChat])
  useEffect(()=>{if(typeof location.state?.question === 'string'){setMessage(location.state.question.slice(0,500));input.current?.focus()}},[location.key,location.state])
  useEffect(()=>{
    if(!focused || busy || photo || message.trim().length<2){setSuggestions([]);return}
    let cancelled=false
    const timer=setTimeout(()=>{fetchSearchSuggestions(message.trim(),5).then(r=>{if(!cancelled)setSuggestions(r.suggestions.slice(0,5))}).catch(()=>{if(!cancelled)setSuggestions([])})},250)
    return ()=>{cancelled=true;clearTimeout(timer)}
  },[message,focused,busy,photo])
  useEffect(()=>{const last=scroll.current?.querySelector<HTMLElement>('.ai-turn:last-of-type');if(scroll.current)scroll.current.scrollTo({top:last ? last.getBoundingClientRect().top-scroll.current.getBoundingClientRect().top+scroll.current.scrollTop : 0,behavior:'auto'})},[turns])

  useEffect(()=>{if(showHistory)scroll.current?.scrollTo({top:0,behavior:'auto'})},[showHistory])
  function draft(text:string,ids:number[]=[]){setBrowseDiscovery(false);setContextIds(ids);setMessage(text.slice(0,500));setJob('find');setFocused(false);input.current?.focus()}
  function clearConversation(){setActiveChat(crypto.randomUUID());setPhotoPreview('');setShowHistory(false);setBrowseDiscovery(false);if(voice.current){voice.current.onresult=null;voice.current.onend=null;voice.current.onerror=null;voice.current.stop();voice.current=null}setListening(false);setVoiceNotice(false);setPhotoBusy(false);requestId.current++;cartRequest.current++;active.current?.abort();setTurns([]);setSelected([]);setPendingCart(null);setShowComparison(false);setPreview('');setPendingQuestion('');setBusy(false);setMessage('');setPhoto(null);setError('');setNotice('');setJob('find');setShown(6);setCartReview(false);setContextIds([]);try{sessionStorage.removeItem(SESSION)}catch{}}
  function openChat(chat:AssistantConversation){clearConversation();setActiveChat(chat.id);setTurns(chat.turns)}
  function deleteChat(id:string){setChats(old=>deleteConversation(old,id));if(id===activeChat)clearConversation();try{const remaining=deleteConversation(chats,id);if(remember)sessionStorage.setItem(CHATS,JSON.stringify({active:id===activeChat?'':activeChat,chats:remaining}))}catch{}}
  async function search(text=message,removeFilters:string[]=[]) {
    if(chats.length>=20 && !chats.some(c=>c.id===activeChat)){setNotice('You have 20 saved conversations. Delete one chat before starting another.');return}
    const question=text.trim();if(busy || photoBusy || question.length<3 || question.length>500)return
    if(/\b(?:track (?:my |an? )?order|return (?:my |an? )?(?:order|item|product)|refund)\b/i.test(question)){setJob(/track/i.test(question)?'track':'return');setNotice('Use the secure order tools below. Your order details have not been sent to an AI model.');return}
    const id=++requestId.current;const controller=new AbortController();active.current=controller;const timer=setTimeout(()=>controller.abort(),20000)
    setBusy(true);setError('');setNotice('');setPreview('');setPendingQuestion(question);setSuggestions([]);setFocused(false)
    try {
      let reply:AssistantReply
      if(photo){
        const response=await searchProductsByImage(photo,question,controller.signal)
        reply=normalizeAssistantReply({answer:response.message || 'These are visual matches from the catalogue. Check the listing to confirm details.',aiUsed:false,products:response.suggestions.map(p=>({...p,price:Number(p.price),url:'https://store.digitalhood.info/product/'+encodeURIComponent(p.slug),stockStatus:p.stock_status,stockLabel:p.stock_label,canAddToCart:false,specifications:[]})),filters:[],followups:['Compare top two','Show specifications','Browse the shop']})
      }else{
        const response=await fetch('https://ai.digitalhood.info/api/assistant/chat',{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify({message:question,removeFilters,productIds:resolveAssistantContext(question,contextIds,selected.map(p=>p.id),[...turns].reverse().find(t=>t.reply.responseMode!=='answer' && t.reply.products.length)?.reply.products.map(p=>p.id) || [],[...turns].reverse().find(t=>t.reply.products.length)?.reply.products.map(p=>p.id) || [],turns.flatMap(t=>t.reply.products))}),signal:controller.signal})
        if(!response.ok)throw new Error(response.status===429?'Please wait before searching again.':'Search is unavailable. Browse the shop or contact support.')
        reply=await readAssistantResponse(response,t=>{if(requestId.current===id)setPreview(t)})
      }
      if(requestId.current!==id)return
      setTurns(old=>[...old,{id,question,reply,removeFilters,photoPreview:photo?photoPreview:undefined}].slice(-30));setMessage('');setPhoto(null);setPhotoPreview('');setContextIds([]);setShown(6);setSelected([]);setShowComparison(false)
    }catch(failure){if(requestId.current===id)setError(failure instanceof Error && failure.name!=='AbortError'?failure.message:'The search took too long. Please try again or browse the shop.')}
    finally{clearTimeout(timer);if(requestId.current===id){setBusy(false);setPreview('');setPendingQuestion('');active.current=null}}
  }
  function submit(event:FormEvent){event.preventDefault();void search()}
  function toggleCompare(product:AssistantProduct){setSelected(old=>old.some(p=>p.id===product.id)?old.filter(p=>p.id!==product.id):old.length<4?[...old,product]:old)}
  async function prepareCart(product:AssistantProduct){
    if(cartBusy)return;const id=++cartRequest.current;setCartBusy(true);setError('')
    try{const fresh=await fetchWooProductBySlug(String(product.id),true);if(cartRequest.current!==id)return
      if(!fresh || !canConfirmAssistantCart(fresh,product.id)){setNotice('This listing needs option, stock or seller verification. Open its product page to continue.');return}setPendingCart(fresh)
    }catch{if(cartRequest.current===id)setError('Could not verify this listing. Please open its product page.')}
    finally{if(cartRequest.current===id)setCartBusy(false)}
  }
  async function confirmCart(){
    if(!pendingCart || cartBusy)return;const previous=pendingCart;const id=++cartRequest.current;setCartBusy(true)
    try{const fresh=await fetchWooProductBySlug(String(previous.id),true);if(cartRequest.current!==id)return
      if(!fresh || !canConfirmAssistantCart(fresh,previous.id)){setPendingCart(null);throw new Error('Availability or options changed. Open the listing to continue.')}
      if(fresh.price!==previous.price || (fresh.sellerKey || fresh.seller?.key)!==(previous.sellerKey || previous.seller?.key)){setPendingCart(fresh);setNotice('Price or seller changed. Please review the updated summary and confirm again.');return}
      const added=addItem({...fresh,images:fresh.images.map(src=>({src}))},1)
      if(!added)throw new Error('Could not add this item. Please check the listing.')
      setPendingCart(null);setCartReview(true);setNotice('Added one item to your cart. Review it before checkout.')
    }catch(failure){if(cartRequest.current===id)setError(failure instanceof Error?failure.message:'Could not add this item.')}
    finally{if(cartRequest.current===id)setCartBusy(false)}
  }
  async function attach(file:File|undefined){
    if(!file)return;if(isVideoAttachment(file)){setError('Videos are not supported. Attach a product photo instead; the video has not been uploaded.');return}const id=++requestId.current;setPhotoBusy(true)
    try{const prepared=await prepareImageSearchFile(file);if(requestId.current!==id)return;const thumbnail=await createImageSearchPreview(prepared);if(requestId.current!==id)return;setPhoto(prepared);setPhotoPreview(thumbnail);setMessage(m=>m || 'Find something like this');setNotice('Your photo stays here until Send. It will use DigitalHood image search.')}
    catch(f){if(requestId.current===id)setError(f instanceof Error?f.message:'Could not prepare photo.')}
    finally{if(requestId.current===id)setPhotoBusy(false)}
  }
  function startVoice(){
    const Constructor=(window as unknown as {SpeechRecognition?:new()=>Voice;webkitSpeechRecognition?:new()=>Voice}).SpeechRecognition || (window as unknown as {webkitSpeechRecognition?:new()=>Voice}).webkitSpeechRecognition
    if(!Constructor){setNotice('Voice input is unavailable in this browser. You can type or use your keyboard microphone.');return}
    const recognition=new Constructor();voice.current=recognition;recognition.lang='en-ZM';recognition.interimResults=false
    recognition.onresult=e=>{setMessage(e.results[0][0].transcript.slice(0,500));setListening(false)}
    recognition.onerror=()=>{setListening(false);setNotice('Voice input stopped. Please type or try again.')};recognition.onend=()=>setListening(false)
    try{recognition.start();setListening(true);setVoiceNotice(false)}catch{setListening(false);setNotice('Microphone could not start. Please type instead.')}
  }
  function followup(label:string,turn:Turn){
    if(label==='Compare top two'){setSelected(turn.reply.products.slice(0,2));setShowComparison(true);return}
    if(label==='Show specifications'){setSelected(turn.reply.products.slice(0,4));setShowComparison(true);return}
    if(label==='Lower my budget'){draft(turn.question.replace(/\b(?:under|below|up to)\s*(?:K|ZMW)?\s*[\d,]+/i,'')+' under K');return}
    draft(label==='Change my search'?'':label)
  }
  const support=<Link to="/support">Talk to support <ArrowRight size={14}/></Link>
  return <><div ref={headerFrame}><Header /></div><div className="ai-app" style={viewportHeight ? {height:viewportHeight} : undefined}>
    <SEO title="DigitalHood AI | Shopping assistant" description="Find, compare and choose products from the live DigitalHood marketplace."/>

    <main className="ai-layout" id="main-content">
      <aside className="ai-rail"><p className="ai-eyebrow">YOUR SHOPPING SPACE</p><button type="button" onClick={clearConversation}><Plus size={16}/>New conversation</button><nav aria-label="Assistant tasks">{jobs.map(({key,label,icon:Icon})=><button type="button" key={key} aria-pressed={job===key} onClick={()=>{setJob(key);if(key==='compare')setShowComparison(true)}}><Icon size={17}/>{label}</button>)}</nav><p className="ai-eyebrow">CONVERSATIONS</p>{chats.map(c=><div className="ai-chat-row" key={c.id}><button type="button" className="ai-history" aria-pressed={activeChat===c.id} onClick={()=>openChat(c)}>{c.title}</button><button type="button" aria-label={'Delete conversation '+c.title} onClick={()=>deleteChat(c.id)}><X size={14}/></button></div>)}<div className="ai-rail-bottom">{support}<button type="button" onClick={()=>setShowPrefs(v=>!v)}>Edit preferences</button><button type="button" onClick={()=>deleteChat(activeChat)}>Delete this conversation</button></div></aside>
      <section className="ai-panel" aria-label="DigitalHood assistant">
        <div className="ai-head"><span className="ai-mark"><Sparkles size={22}/></span><div><h1>DigitalHood AI</h1><small>Your personal shopping assistant</small></div>{compactDiscovery && <button type="button" className="ai-discover-toggle" aria-pressed={browseDiscovery} onClick={()=>setBrowseDiscovery(v=>!v)}>{browseDiscovery?"Back to chat":"Discover"}</button>}</div>
        <nav className="ai-mobile-jobs" aria-label="Assistant tasks on mobile">{jobs.map(({key,label})=><button type="button" key={key} aria-pressed={job===key} onClick={()=>{setJob(key);if(key==='compare')setShowComparison(true)}}>{label}</button>)}</nav>
        <div className="ai-scroll" ref={scroll} hidden={compactDiscovery && browseDiscovery}>
          {showHistory && <section className="ai-note"><h2>Conversations</h2>{chats.map(c=><div className="ai-chat-row" key={c.id}><button type="button" onClick={()=>openChat(c)}>{c.title}</button><button type="button" aria-label={'Delete conversation '+c.title} onClick={()=>deleteChat(c.id)}>Delete</button></div>)}{!chats.length && <p>No saved conversations yet.</p>}</section>}
          {showPrefs && <section className="ai-note"><h2>Shopping preferences</h2><p>Save only a budget and size on this device. Addresses stay in your secure checkout account.</p><label>Budget in Kwacha<input type="number" min="1" max="999999999" value={budget} onChange={e=>setBudget(e.target.value.slice(0,12))}/></label><label>Size / device preference<input maxLength={40} value={size} onChange={e=>setSize(e.target.value)}/></label><div className="ai-actions"><button type="button" onClick={()=>{const prefs={budget:/^\d+(\.\d{1,2})?$/.test(budget)?budget:'',size:size.slice(0,40)};setSavedPrefs(prefs);try{localStorage.setItem(PREFS,JSON.stringify(prefs))}catch{}setShowPrefs(false)}}>Save preferences</button><button type="button" onClick={()=>{setSavedPrefs(null);setBudget('');setSize('');try{localStorage.removeItem(PREFS)}catch{}}}>Forget preferences</button></div><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Keep conversations in this browser tab (up to 20 chats, 30 exchanges each). Photos are saved as small previews; shared-device users can turn this off.</label><button type="button" onClick={()=>deleteChat(activeChat)}>Delete this conversation</button></section>}
          {(job==='track'||job==='return')?<section className="ai-welcome"><h2>{job==='track'?'Where is my order?':'Help with a return'}</h2><p>Use your secure order page to view tracking or review an issue before submitting a request. The AI cannot place orders, send payments or issue refunds.</p><div className="ai-actions"><Link to={job==='track'?'/track-order':'/orders'}>{job==='track'?'Track an order':'Choose an order'}</Link><Link to="/returns">Return information</Link>{support}</div></section>:<>
          {!turns.length && <section className="ai-welcome"><p className="ai-eyebrow">FIND IT FASTER. SHOP SMARTER.</p><h2>Hey there 👋<br/>What are you <span>shopping for?</span></h2><p>Tell me what you need, your budget or what matters most.</p><div className="ai-chips">{['Laptop under K8,000','Gaming mouse','Compare phones'].map(p=><button type="button" key={p} onClick={()=>draft(p)}>{p}</button>)}</div><h3>Or start with what matters to you</h3><div className="ai-starters">{[['Shop my budget','Find a laptop under K8,000'],['Compare the options','Compare phones'],['Find compatible gear','Find a charger for my device'],['Help me decide','Help me decide']].map(([label,q])=><button type="button" key={label} onClick={()=>draft(q)}><Sparkles size={18}/><span>{label}</span></button>)}</div>{savedPrefs && <button type="button" onClick={()=>draft(`Find ${savedPrefs.size || 'products'}${savedPrefs.budget?' under K'+savedPrefs.budget:''}`)}>Use my saved preferences</button>}</section>}
          {turns.map((turn,index)=><section key={turn.id} className="ai-turn"><div className="ai-user">{turn.photoPreview && <img className="ai-upload-preview" src={turn.photoPreview} alt="Uploaded product photo"/>}<p>{turn.question}</p></div><div className="ai-answer"><Sparkles size={18}/><p>{turn.reply.answer}</p></div><div className="ai-filters">{turn.reply.filters.map(f=><button type="button" disabled={busy} key={f.key} onClick={()=>void search(turn.question,[...new Set([...(turn.removeFilters || []),f.key])])}>{turn.reply.relaxedFilters.includes(f.key)?'Relaxed: ':''}{f.label} <X size={12}/></button>)}</div>{turn.reply.responseMode!=='answer' && turn.reply.products.length>0 && <><p className="ai-source">Catalogue results · Prices checked when searched · Shipping fees calculated at checkout</p><div className="ai-products">{turn.reply.products.slice(0,index===turns.length-1?shown:3).map(p=><ProductCard key={p.id} product={p} selected={selected} cartBusy={cartBusy} draft={draft} toggleCompare={toggleCompare} prepareCart={prepareCart}/>)}</div>{index===turns.length-1 && shown<turn.reply.products.length && <button type="button" onClick={()=>setShown(12)}>Show more products</button>}</>}{turn.reply.responseMode==='answer' && turn.reply.products.length>0 && <div className="ai-chips" aria-label="Sources for this answer">{turn.reply.products.map(p=><Link key={p.id} to={new URL(p.url).pathname}>Source: {p.name.slice(0,45)}{p.name.length>45?'…':''}</Link>)}</div>}<div className="ai-chips">{(turn.reply.followups.length?turn.reply.followups:['Change my search','Browse the shop','Talk to support']).map(label=>label==='Browse the shop'?<Link key={label} to="/shop">Browse the shop</Link>:label==='Talk to support'?<Link key={label} to="/support">Talk to support</Link>:<button type="button" key={label} disabled={busy} onClick={()=>followup(label,turn)}>{label}</button>)}</div>{turn.reply.aiUsed && <small>AI-assisted answer. Check linked listings for product facts.</small>}</section>)}
          {showComparison && <section className="ai-note"><h2>Compare your options</h2><p>{selected.length<2?'Select two to four products using their compare buttons.':'Compare only published details. Missing specifications are shown explicitly.'}</p>{selected.length>0 && <div className="ai-table-wrap"><table><caption>Selected catalogue listings</caption><thead><tr><th>Detail</th>{selected.map(p=><th key={p.id}><Link to={new URL(p.url).pathname}>{p.name}</Link><button type="button" aria-label={'Remove '+p.name+' from comparison'} onClick={()=>toggleCompare(p)}>×</button></th>)}</tr></thead><tbody><tr><th>Price</th>{selected.map(p=><td key={p.id}>{money(p.price)}</td>)}</tr><tr><th>Seller</th>{selected.map(p=><td key={p.id}>{p.sellerStoreName || 'Check listing'}</td>)}</tr>{[...new Set(selected.flatMap(p=>p.specifications.map(s=>s.label)))].slice(0,12).map(label=><tr key={label}><th>{label}</th>{selected.map(p=><td key={p.id}>{p.specifications.find(s=>s.label===label)?.value || 'Not published'}</td>)}</tr>)}</tbody></table></div>}{selected.length>=2 && <button type="button" onClick={()=>draft('Compare these selected products',selected.map(p=>p.id))}>Ask AI about these options</button>}{support}</section>}
          {selected.length>0 && !showComparison && <button type="button" onClick={()=>setShowComparison(true)}>Compare selected ({selected.length}/4)</button>}
          </>}
          {cartBusy && <p role="status" className="ai-source">Checking current price, seller and stock…</p>}
          {pendingCart && <section className="ai-note" aria-label="Confirm cart addition"><h2>Review before adding</h2><p>{pendingCart.name} · Quantity 1</p><p>{money(pendingCart.price)} · {pendingCart.sellerStoreName || pendingCart.seller?.storeName || pendingCart.sellerKey}</p><p>Delivery and fees will be checked during checkout.</p><div className="ai-actions"><button type="button" disabled={cartBusy} onClick={()=>void confirmCart()}>{cartBusy?'Checking…':'Confirm add to cart'}</button><button type="button" disabled={cartBusy} onClick={()=>{cartRequest.current++;setPendingCart(null)}}>Cancel</button>{support}</div></section>}
          {cartReview && <section className="ai-note"><h2>Your cart</h2>{items.length?items.map(item=><p key={item.id}>{item.name} · {item.quantity} × {money(item.price)} · {item.sellerStoreName || 'Seller details in cart'}</p>):<p>Your cart is empty.</p>}<p>Each seller’s availability, shipping and fees are checked in the existing cart and checkout.</p><div className="ai-actions"><Link to="/cart">Review cart & choose sellers</Link>{items.length>0 && <Link to="/checkout">Continue to secure checkout</Link>}{support}</div></section>}
          {busy && <div role="status" className="ai-turn"><div className="ai-user">{photoPreview && <img className="ai-upload-preview" src={photoPreview} alt="Product photo being searched"/>}<p>{pendingQuestion}</p></div><p>{preview || 'Searching the live catalogue…'}</p><Loader2 size={20} className="animate-spin motion-reduce:animate-none"/></div>}
          {error && <div role="alert" className="ai-note"><p>{error}</p><div className="ai-actions"><Link to="/shop">Browse the shop</Link>{support}</div></div>}
          {notice && <p role="status" className="ai-source">{notice}</p>}

        </div>
        {compactDiscovery && browseDiscovery && <div className="ai-discovery-mobile"><AssistantDiscovery excludedIds={turns.flatMap(t=>t.reply.products.map(p=>p.id))} /></div>}
        <form hidden={compactDiscovery && browseDiscovery} className="ai-composer" onSubmit={submit}>
          {contextIds.length>0 && <p>Using {contextIds.length} selected catalogue listing(s)<button type="button" onClick={()=>setContextIds([])} aria-label="Clear selected product context"><X size={16}/></button></p>}
          {suggestions.length>0 && <div className="ai-suggestions" aria-label="Live catalogue suggestions">{suggestions.map(p=><button type="button" key={p.id} onClick={()=>{draft(p.name);setSuggestions([])}}>{p.name}<span>{money(Number(p.price))}</span></button>)}</div>}
          {photo && <p><img className="ai-upload-preview" src={photoPreview} alt="Attached product photo"/><button type="button" aria-label="Remove attached photo" onClick={()=>{setPhoto(null);setPhotoPreview('')}}><X size={16}/></button></p>}
          {voiceNotice && <div className="ai-source">Voice uses your browser’s speech service and may send audio to its provider. Review the transcript before sending.<button type="button" onClick={startVoice}>Start voice input</button><button type="button" onClick={()=>setVoiceNotice(false)}>Cancel</button></div>}
          <label htmlFor="shopping-question" className="sr-only">Ask for a product, budget or recommendation</label><textarea ref={input} id="shopping-question" maxLength={500} rows={2} value={message} onChange={e=>{setMessage(e.target.value)}} onFocus={()=>setFocused(true)} placeholder="Ask for a product, budget or recommendation…" disabled={busy || job==='track' || job==='return'}/>
          <div className="ai-composer-actions"><div><input ref={upload} type="file" accept="image/*" className="sr-only" onChange={e=>{void attach(e.target.files?.[0]);e.target.value=''}}/><button type="button" aria-label="Attach product photo" disabled={busy || job==='track' || job==='return'} onClick={()=>upload.current?.click()}><Paperclip size={20}/></button><button type="button" aria-label={listening?'Stop voice input':'Use voice input'} aria-pressed={listening} disabled={busy || job==='track' || job==='return'} onClick={()=>listening?voice.current?.stop():setVoiceNotice(true)}><Mic size={22}/></button><button type="button" className="ai-mobile-memory" onClick={()=>setShowPrefs(v=>!v)}>Preferences</button></div><button type="submit" className="ai-send" disabled={busy || photoBusy || message.trim().length<3 || job==='track' || job==='return'}>{photoBusy?'Preparing…':'Send'} <Send size={16}/></button></div><small>Photos supported · Videos not supported. Review listings before buying.</small>
        </form>
        <nav className="ai-bottom" aria-label="Mobile navigation"><button type="button" onClick={clearConversation}>New chat</button><button type="button" onClick={()=>setShowHistory(v=>!v)}>Chats</button><button type="button" onClick={()=>setCartReview(v=>!v)}>Cart</button><button type="button" onClick={()=>deleteChat(activeChat)}>Delete this chat</button></nav>
      </section>
      {!compactDiscovery && <AssistantDiscovery excludedIds={turns.flatMap(t=>t.reply.products.map(p=>p.id))} />}
    </main>
  </div><Footer /></>
}
