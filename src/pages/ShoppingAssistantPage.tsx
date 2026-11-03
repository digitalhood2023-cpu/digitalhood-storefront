import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Mic, Paperclip, Send, Sparkles, X, Plus, Scale, Search, Package, RotateCcw, Heart, Loader2, MessageCircle, Pencil } from 'lucide-react'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import AssistantDiscovery from '@/components/AssistantDiscovery'
import AssistantPrivateOrders from '@/components/AssistantPrivateOrders'
import AssistantAnswerOptions from '@/components/AssistantAnswerOptions'
import {relevantAssistantFollowups,nextAssistantTurnId,assistantRequestContext} from '@/lib/shoppingAssistant'
import {useWishlist} from '@/context/WishlistContext'
import type {Product} from '@/types'
import SEO from '@/components/SEO'
import { fetchSearchSuggestions, fetchWooProductBySlug, searchProductsByImage, type SearchSuggestionProduct, type WooProduct } from '@/lib/woocommerce'
import { prepareImageSearchFile, createImageSearchPreview, isVideoAttachment } from '@/lib/imageSearch'
import { useCartStore } from '@/store/cartStore'
import { assistantPrivateIntent, assistantContainsSecrets, normalizeAssistantReply, readAssistantResponse, isAssistantAcknowledgement, incrementConciergeMetric, type ConciergeMetrics, normalizeConversations, saveConversation, deleteConversation, type AssistantConversation, type ChatTurn, canConfirmAssistantCart, type AssistantProduct, type AssistantReply } from '@/lib/shoppingAssistant'
import { ACCOUNT_STATE_CLEARED_EVENT } from '@/lib/marketplaceBrowserState'
import {readMarketplaceSearchHistory} from '@/lib/marketplaceBrowserState'
import {useRecentlyViewed} from '@/context/RecentlyViewedContext'
import {assistantEnvironment} from '@/lib/assistantEnvironment'
import './shopping-assistant.css'

type Turn = ChatTurn
type Job = 'chat' | 'find' | 'compare' | 'track' | 'return' | 'value'
type Voice = {start:()=>void; stop:()=>void; onresult:((event:{results:{[index:number]:{[index:number]:{transcript:string}}}})=>void)|null; onerror:(()=>void)|null; onend:(()=>void)|null; lang:string; interimResults:boolean}
const jobs = [{key:'chat',label:'Chat',icon:MessageCircle},{key:'find',label:'Find products',icon:Search},{key:'compare',label:'Compare',icon:Scale},{key:'track',label:'Track order',icon:Package},{key:'return',label:'Returns',icon:RotateCcw},{key:'value',label:'Help me decide',icon:Heart}] as const
const SESSION = 'digitalhood-ai-session-v1'
const CHATS = 'digitalhood-ai-conversations-v2'
const MEMORY = SESSION+'-enabled'
const BROWSING = SESSION+'-browsing-interests'
const PREFS = 'digitalhood-ai-preferences-v1'
const money = (n:number) => new Intl.NumberFormat('en-ZM',{style:'currency',currency:'ZMW'}).format(n)
  function ProductCard({product,selected,cartBusy,draft,toggleCompare,prepareCart}:{product:AssistantProduct;selected:AssistantProduct[];cartBusy:boolean;draft:(text:string,ids?:number[])=>void;toggleCompare:(p:AssistantProduct)=>void;prepareCart:(p:AssistantProduct)=>Promise<void>}){const {toggleWishlist,isInWishlist}=useWishlist();return <article className="ai-product" data-product-id={product.id}>
    <Link to={new URL(product.url).pathname} className="ai-photo"><img src={product.image} alt="" width={240} height={160} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={e=>{if(e.currentTarget.getAttribute('src')!=='/product-placeholder.svg')e.currentTarget.src='/product-placeholder.svg'}}/></Link>
    <div className="ai-product-body"><Link to={new URL(product.url).pathname} className="ai-name">{product.name}</Link><strong>{money(product.price)}</strong>{product.onSale&&product.regularPrice&&<small><s>{money(product.regularPrice)}</s> · {Math.round((1-product.price/product.regularPrice)*100)}% off</small>}
      <small>{[product.sellerStoreName,product.stockLabel,product.totalSales?`${product.totalSales} sold`:'',product.ratingCount&&product.averageRating!=null?`★ ${product.averageRating.toFixed(1)}`:''].filter(Boolean).join(' · ')}</small>
      <div className="ai-actions"><button type="button" onClick={()=>draft('Tell me about '+product.name,[product.id])}>Ask</button>{product.canAddToCart===true?<button type="button" disabled={cartBusy} onClick={()=>void prepareCart(product)}>Add to cart</button>:<Link to={new URL(product.url).pathname}>View <ArrowRight size={14}/></Link>}<button type="button" aria-label={'Compare '+product.name} aria-pressed={selected.some(p=>p.id===product.id)} onClick={()=>toggleCompare(product)}><Scale size={14}/></button><button type="button" aria-label={'Save '+product.name} aria-pressed={isInWishlist(String(product.id))} onClick={()=>toggleWishlist({id:String(product.id),name:product.name,price:product.price,image:product.image,rating:product.averageRating || 0,reviews:product.ratingCount || 0,category:'Marketplace',inStock:product.stockStatus==='instock'} satisfies Product)}><Heart size={14} fill={isInWishlist(String(product.id))?'currentColor':'none'}/></button></div>
    </div>
  </article>}

export default function ShoppingAssistantPage() {
  const location = useLocation()
  const [message,setMessage] = useState<string>(typeof location.state?.question === 'string' ? location.state.question.slice(0,4000) : '')
  const [editingIndex,setEditingIndex]=useState<number|null>(null)
  const [metrics,setMetrics]=useState<Partial<ConciergeMetrics>>({})
  const [chats,setChats]=useState<AssistantConversation[]>([])
  const [activeChat,setActiveChat]=useState<string>(()=>crypto.randomUUID())
  const [showHistory,setShowHistory]=useState(false)
  const [photoPreview,setPhotoPreview]=useState('')
  const [turns,setTurns] = useState<Turn[]>([])
  const [job,setJob] = useState<Job>('chat')
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
  const [useBrowsing,setUseBrowsing]=useState(false)
  const {items:recentItems}=useRecentlyViewed()
  const [showPrefs,setShowPrefs] = useState(false)
  const [budget,setBudget] = useState('')
  const [size,setSize] = useState('')
  const [savedPrefs,setSavedPrefs] = useState<{budget:string;size:string}|null>(null)
  const [voiceNotice,setVoiceNotice] = useState(false)
  const [listening,setListening] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const upload = useRef<HTMLInputElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const followLatest=useRef(true)
  const active = useRef<AbortController|null>(null)
  const voice = useRef<Voice|null>(null)
  const requestId = useRef(0)
  const cartRequest = useRef(0)
  const items = useCartStore(s=>s.items)
  const addItem = useCartStore(s=>s.addItem)
  const [shown,setShown] = useState(4)
  const [pageBusy,setPageBusy]=useState<number|null>(null)
  const [feedbackBusy,setFeedbackBusy]=useState<number|null>(null)
  useEffect(()=>{setPageBusy(null);followLatest.current=true},[activeChat])

  useEffect(()=>{
    const viewport=window.visualViewport
    const resize=()=>{setCompactDiscovery(window.innerWidth<=1100);setViewportHeight(Math.max(240,Math.round((viewport?.height || window.innerHeight)-(headerFrame.current?.getBoundingClientRect().height || 0))))}
    const observer=new ResizeObserver(resize);if(headerFrame.current)observer.observe(headerFrame.current)
    resize();viewport?.addEventListener('resize',resize);window.addEventListener('resize',resize)
    return ()=>{observer.disconnect();viewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize)}
  },[])
  useEffect(()=>{
    try {
      const rawMetrics=JSON.parse(sessionStorage.getItem('digitalhood-ai-metrics') || '{}');const cleanMetrics=incrementConciergeMetric(rawMetrics,'searches');cleanMetrics.searches--;setMetrics(cleanMetrics)
      const stored = JSON.parse(localStorage.getItem(PREFS) || 'null')
      if (stored && typeof stored.budget === 'string' && typeof stored.size === 'string') {setSavedPrefs({budget:stored.budget.slice(0,12),size:stored.size.slice(0,40)});setBudget(stored.budget.slice(0,12));setSize(stored.size.slice(0,40))}
      setRemember(sessionStorage.getItem(MEMORY)!=='false')
      setUseBrowsing(sessionStorage.getItem(BROWSING)==='true')
      const storedChats=JSON.parse(sessionStorage.getItem(CHATS) || 'null')
      const legacy=JSON.parse(sessionStorage.getItem(SESSION) || 'null')
      const restored=normalizeConversations(storedChats?.chats || (Array.isArray(legacy)?[{id:'legacy-chat',turns:legacy,updated:Date.now()}]:[]))
      setChats(restored)
      const current=storedChats?.active?restored.find(c=>c.id===storedChats.active):restored[0]
      if(current){setActiveChat(current.id);setTurns(current.turns)}else if(typeof storedChats?.active==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(storedChats.active))setActiveChat(storedChats.active)
      sessionStorage.removeItem(SESSION)
    } catch { /* Storage may be unavailable. */ }
    setHydrated(true)
    const clear = ()=>{setMetrics({});try{sessionStorage.removeItem('digitalhood-ai-metrics')}catch{}setChats([]);setActiveChat(crypto.randomUUID());setPhotoPreview('');setShowHistory(false);requestId.current++;cartRequest.current++;active.current?.abort();if(voice.current){voice.current.onresult=null;voice.current.onend=null;voice.current.onerror=null;voice.current.stop();voice.current=null}setTurns([]);setPendingCart(null);setSelected([]);setSavedPrefs(null);setBudget('');setSize('');setRemember(false);setListening(false);setVoiceNotice(false);setPhotoBusy(false);setContextIds([]);setBusy(false);setPreview('');setPhoto(null);setMessage('');setCartReview(false);try{localStorage.removeItem(PREFS);sessionStorage.removeItem(SESSION);sessionStorage.removeItem(MEMORY);sessionStorage.removeItem(CHATS)}catch{}}
    window.addEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear)
    return ()=>{window.removeEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear);requestId.current++;cartRequest.current++;active.current?.abort();if(voice.current){voice.current.onresult=null;voice.current.onend=null;voice.current.onerror=null;voice.current.stop()}}
  },[])
  useEffect(()=>{if(!hydrated)return;const next=saveConversation(chats,activeChat,turns,Date.now());if(turns.length)setChats(next);try{sessionStorage.setItem(MEMORY,String(remember));if(remember)sessionStorage.setItem(CHATS,JSON.stringify({active:activeChat,chats:next}));else sessionStorage.removeItem(CHATS)}catch{setNotice('Chat history could not be saved in this browser. Delete unneeded chats or free browser storage.')}},[turns,remember,hydrated,activeChat])
  useEffect(()=>{if(typeof location.state?.question === 'string'){setMessage(location.state.question.slice(0,4000));input.current?.focus()}},[location.key,location.state])
  useEffect(()=>{
    if(job!=='find' || !focused || busy || photo || message.length>180 || assistantPrivateIntent(message) || assistantContainsSecrets(message) || isAssistantAcknowledgement(message) || message.trim().length<2){setSuggestions([]);return}
    let cancelled=false
    const timer=setTimeout(()=>{fetchSearchSuggestions(message.trim(),5).then(r=>{if(!cancelled)setSuggestions(r.suggestions.slice(0,5))}).catch(()=>{if(!cancelled)setSuggestions([])})},250)
    return ()=>{cancelled=true;clearTimeout(timer)}
  },[message,focused,busy,photo,job])
  useLayoutEffect(()=>{if(!followLatest.current)return;const panel=scroll.current,all=panel?.querySelectorAll<HTMLElement>('.ai-turn'),target=all?.[all.length-1];if(panel&&target)panel.scrollTo({top:target.getBoundingClientRect().top-panel.getBoundingClientRect().top+panel.scrollTop-8,behavior:'auto'})},[turns.length,busy,pendingQuestion,preview])

  useEffect(()=>{if(showHistory||showPrefs)scroll.current?.scrollTo({top:0,behavior:'auto'})},[showHistory,showPrefs])
  useEffect(()=>{if(hydrated)try{sessionStorage.setItem(BROWSING,String(useBrowsing))}catch{/* Per-page choice still works. */}},[useBrowsing,hydrated])
  useEffect(()=>{const clear=()=>{setUseBrowsing(false);try{sessionStorage.removeItem(BROWSING)}catch{}};window.addEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear);return()=>window.removeEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear)},[])
  function metric(key:keyof ConciergeMetrics){setMetrics(old=>{const next=incrementConciergeMetric(old,key);try{sessionStorage.setItem('digitalhood-ai-metrics',JSON.stringify(next))}catch{}return next})}
  function draft(text:string,ids:number[]=[]){setBrowseDiscovery(false);setContextIds(ids);setMessage(text.slice(0,4000));setJob('chat');setFocused(false);input.current?.focus()}
  function clearConversation(){setEditingIndex(null);setActiveChat(crypto.randomUUID());setPhotoPreview('');setShowHistory(false);setBrowseDiscovery(false);if(voice.current){voice.current.onresult=null;voice.current.onend=null;voice.current.onerror=null;voice.current.stop();voice.current=null}setListening(false);setVoiceNotice(false);setPhotoBusy(false);requestId.current++;cartRequest.current++;active.current?.abort();setTurns([]);setSelected([]);setPendingCart(null);setShowComparison(false);setPreview('');setPendingQuestion('');setBusy(false);setMessage('');setPhoto(null);setError('');setNotice('');setJob('chat');setShown(5);setCartReview(false);setContextIds([]);try{sessionStorage.removeItem(SESSION)}catch{}}
  function openChat(chat:AssistantConversation){clearConversation();setActiveChat(chat.id);setTurns(chat.turns)}
  function deleteChat(id:string){setChats(old=>deleteConversation(old,id));if(id===activeChat)clearConversation();try{const remaining=deleteConversation(chats,id);if(remember)sessionStorage.setItem(CHATS,JSON.stringify({active:id===activeChat?'':activeChat,chats:remaining}))}catch{}}
  async function search(text=message,removeFilters:string[]=[],retryIndex?:number) {
    if(chats.length>=20 && !chats.some(c=>c.id===activeChat)){setNotice('You have 20 saved conversations. Delete one chat before starting another.');return}
    const editIndex=retryIndex??editingIndex
    const conversationTurns=editIndex===null?turns:turns.slice(0,editIndex)
    const question=text.trim();if(busy || pageBusy!==null || photoBusy || (question.length<3 && !isAssistantAcknowledgement(question)) || question.length>4000)return
    if(assistantContainsSecrets(question)){setError('Please remove passwords, PINs, OTPs, API keys and card details. Nothing was sent.');return}
    if(assistantPrivateIntent(question)){setError('');setMessage('');setJob(/track|where/i.test(question)?'track':'return');setNotice('Use the secure order tools below. Your order details have not been sent to an AI model.');return}
    const id=++requestId.current;const controller=new AbortController();active.current=controller;const timer=setTimeout(()=>controller.abort(),35000)
    const turnId=nextAssistantTurnId(turns)
    followLatest.current=true;setBusy(true);setError('');setNotice('');setPreview('');setPendingQuestion(question);setSuggestions([]);setFocused(false)
    try {
      let reply:AssistantReply
      if(photo){
        const response=await searchProductsByImage(photo,question,controller.signal)
        reply=normalizeAssistantReply({answer:response.message || 'These are visual matches from the catalogue. Check the listing to confirm details.',aiUsed:false,products:response.suggestions.map(p=>({...p,price:Number(p.price),url:'https://store.digitalhood.info/product/'+encodeURIComponent(p.slug),stockStatus:p.stock_status,stockLabel:p.stock_label,canAddToCart:false,specifications:[]})),filters:[],followups:['Compare top two','Show specifications','Browse the shop']})
      }else{
        const response=await fetch('https://ai.digitalhood.info/api/assistant/chat',{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify({message:question,removeFilters,previousSearch:[...conversationTurns].reverse().find(t=>t.reply.responseMode!=='answer')?.reply.searchState,...assistantRequestContext(question,conversationTurns,contextIds,selected.map(p=>p.id)),...assistantEnvironment({enabled:useBrowsing,readSearches:readMarketplaceSearchHistory,recentlyViewed:recentItems})}),signal:controller.signal})
        if(!response.ok)throw new Error(response.status===429?'Please wait before sending another message.':'The assistant is unavailable right now. Please try again shortly.')
        reply=await readAssistantResponse(response,t=>{if(requestId.current===id)setPreview(t)})
      }
      if(requestId.current!==id)return
      if(reply.responseMode!=='answer' && reply.searchState){metric(/^(?:cheaper|show cheaper|only |under |below |budget |more like this)/i.test(question)?'refinements':'searches')}
      setTurns(old=>[...(editIndex===null?old:old.slice(0,editIndex)),{id:turnId,question,reply,removeFilters,photoPreview:photo?photoPreview:undefined}].slice(-30));setEditingIndex(null);setMessage('');setPhoto(null);setPhotoPreview('');setContextIds([]);setShown(4);setSelected([]);setShowComparison(false)
    }catch(failure){if(requestId.current===id)setError(failure instanceof Error && failure.name!=='AbortError'?failure.message:'The search took too long. Please try again or browse the shop.')}
    finally{clearTimeout(timer);if(requestId.current===id){setBusy(false);setPreview('');setPendingQuestion('');active.current=null}}
  }
  async function submitFeedback(turn:Turn,helpful:boolean){
    if(turn.feedback||feedbackBusy!==null)return
    const generation=requestId.current;setFeedbackBusy(turn.id)
    try{
      if(turn.reply.feedbackToken){
        const response=await fetch('https://ai.digitalhood.info/api/assistant/feedback',{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(6000),body:JSON.stringify({feedbackToken:turn.reply.feedbackToken,helpful})})
        if(!response.ok)throw Error('Feedback could not be recorded. It may have expired or already been received.')
      }
      if(requestId.current!==generation)return
      metric(helpful?'positive':'negative');setTurns(old=>old.map(t=>t.id===turn.id?{...t,feedback:helpful?'up':'down'}:t))
      setNotice(turn.reply.feedbackToken?'Thank you. Your feedback was recorded without sending your conversation.':'Feedback saved on this device only.')
    }catch(failure){if(requestId.current===generation)setNotice(failure instanceof Error?failure.message:'Feedback could not be recorded. Please retry.')}
    finally{setFeedbackBusy(null)}
  }
  async function loadMore(turn:Turn){
    if(busy||pageBusy!==null)return
    if(shown<turn.reply.products.length){setShown(n=>n+4);return}
    const token=turn.reply.pagination?.token;if(!token)return
    const id=++requestId.current,controller=new AbortController();active.current=controller;setPageBusy(turn.id);setNotice('');followLatest.current=false
    const count=turn.reply.products.length
    try{
      const res=await fetch('https://ai.digitalhood.info/api/assistant/chat',{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(35000)]),body:JSON.stringify({message:'Load more products',pageToken:token})})
      if(!res.ok)throw Error(res.status===429?'Please wait before loading more products.':'More products could not load. Please retry.')
      const reply=normalizeAssistantReply(await res.json());if(requestId.current!==id)return
      if(reply.pageUnavailable)throw Error(reply.answer)
      if(reply.expiredPage){setTurns(old=>old.map(t=>t.id===turn.id?{...t,reply:{...t.reply,pagination:undefined}}:t));setNotice(reply.answer);return}
      setTurns(old=>old.map(t=>t.id===turn.id?{...t,reply:{...t.reply,products:[...new Map([...t.reply.products,...reply.products].map(p=>[p.id,p])).values()],contextToken:reply.contextToken,pagination:reply.pagination}}:t));setShown(n=>n+reply.products.length)
      if(reply.products.length)requestAnimationFrame(()=>{const panel=scroll.current,target=panel?.querySelectorAll<HTMLElement>(`.ai-turn[data-turn-id="${turn.id}"] .ai-product`)[count];if(panel&&target)panel.scrollTo({top:target.getBoundingClientRect().top-panel.getBoundingClientRect().top+panel.scrollTop-8,behavior:'auto'})})
    }catch(e){if(requestId.current===id)setNotice(e instanceof Error&&e.name!=='AbortError'?e.message:'Loading more took too long. Your existing results are kept; retry.')}
    finally{if(requestId.current===id){setPageBusy(null);active.current=null}}
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
      metric('cartAdds');setPendingCart(null);setCartReview(true);setNotice('Added one item to your cart. Review it before checkout.')
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
    recognition.onresult=e=>{setMessage(e.results[0][0].transcript.slice(0,4000));setListening(false)}
    recognition.onerror=()=>{setListening(false);setNotice('Voice input stopped. Please type or try again.')};recognition.onend=()=>setListening(false)
    try{recognition.start();setListening(true);setVoiceNotice(false)}catch{setListening(false);setNotice('Microphone could not start. Please type instead.')}
  }
  function followup(label:string,turn:Turn){
    const contextualProducts=turn.reply.products.length?turn.reply.products:[...turns.slice(0,turns.indexOf(turn))].reverse().find(t=>t.reply.products.length)?.reply.products || []
    if(label==='Compare top two'){setSelected(contextualProducts.slice(0,2));setShowComparison(true);return}
    if(label==='Show specifications'){setSelected(contextualProducts.slice(0,4));setShowComparison(true);return}
    if(label==='Cheaper'){draft('Cheaper');return}
    if(label==='Remove price limit'){void search(turn.reply.searchState || turn.question,[...new Set([...(turn.removeFilters || []),'maxPrice'])]);return}
    if(label==='Lower my budget'){draft(turn.question.replace(/\b(?:under|below|up to)\s*(?:K|ZMW)?\s*[\d,]+/i,'')+' under K');return}
    draft(label==='Change my search'?'':label)
  }
  const support=<Link to="/support" onClick={()=>metric('escalations')}>Talk to support <ArrowRight size={14}/></Link>
  return <><div ref={headerFrame}><Header /></div><div className="ai-app" style={viewportHeight ? {height:viewportHeight} : undefined}>
    <SEO title="DigitalHood AI | Chat & shopping help" description="Ask questions, understand technology and find verified products on DigitalHood."/>

    <main className={"ai-layout"+(!compactDiscovery&&browseDiscovery?" ai-with-discovery":"")} id="main-content">
      <aside className="ai-rail"><p className="ai-eyebrow">YOUR SHOPPING SPACE</p><button type="button" onClick={clearConversation}><Plus size={16}/>New conversation</button><nav aria-label="Assistant tasks">{jobs.map(({key,label,icon:Icon})=><button type="button" key={key} aria-pressed={job===key} onClick={()=>{setBrowseDiscovery(false);setJob(key);if(key==='compare')setShowComparison(true)}}><Icon size={17}/>{label}</button>)}</nav><p className="ai-eyebrow">CONVERSATIONS</p>{chats.map(c=><div className="ai-chat-row" key={c.id}><button type="button" className="ai-history" aria-pressed={activeChat===c.id} onClick={()=>openChat(c)}>{c.title}</button><button type="button" aria-label={'Delete conversation '+c.title} onClick={()=>deleteChat(c.id)}><X size={14}/></button></div>)}<div className="ai-rail-bottom">{support}<Link to="/shop">Browse normally</Link><Link to="/wishlist">Saved shortlist</Link><a href="https://seller.digitalhood.info">Seller tools</a><button type="button" onClick={()=>setShowPrefs(v=>!v)}>Edit preferences</button><button type="button" onClick={()=>deleteChat(activeChat)}>Delete this conversation</button></div></aside>
      <section className="ai-panel" aria-label="DigitalHood assistant">
        <div className="ai-head"><span className="ai-mark"><Sparkles size={22}/></span><div><h1>DigitalHood AI</h1><small>Questions, explanations and live marketplace help</small></div>{<button type="button" className="ai-discover-toggle" aria-pressed={browseDiscovery} onClick={()=>setBrowseDiscovery(v=>!v)}>{browseDiscovery?"Back to chat":"Browse products"}</button>}</div>
        <nav className="ai-mobile-jobs" aria-label="Assistant tasks on mobile">{jobs.map(({key,label})=><button type="button" key={key} aria-pressed={job===key} onClick={()=>{setBrowseDiscovery(false);setJob(key);if(key==='compare')setShowComparison(true)}}>{label}</button>)}</nav>
        <div className="ai-scroll" ref={scroll} hidden={compactDiscovery && browseDiscovery} onWheel={e=>{if(e.deltaY<0)followLatest.current=false}} onTouchStart={()=>{followLatest.current=false}}>
          {showHistory && <section className="ai-note"><h2>Conversations</h2>{chats.map(c=><div className="ai-chat-row" key={c.id}><button type="button" onClick={()=>openChat(c)}>{c.title}</button><button type="button" aria-label={'Delete conversation '+c.title} onClick={()=>deleteChat(c.id)}>Delete</button></div>)}{!chats.length && <p>No saved conversations yet.</p>}</section>}
          {showPrefs&&<section className="ai-note"><label><input type="checkbox" checked={useBrowsing} disabled={busy||pageBusy!==null} onChange={e=>{const enabled=e.target.checked;setUseBrowsing(enabled);if(!enabled)setTurns(old=>old.map(t=>t.reply.discovery?{...t,reply:{...t.reply,pagination:undefined,contextToken:undefined}}:t))}}/> Use my DigitalHood browsing interests</label><p>Optional for recommendations in this tab. Only broad product interests are used—not raw searches, viewed-product logs, personal details or off-site browser history. Turn off to stop using them for new picks.</p></section>}
          {showPrefs && <section className="ai-note"><h2>Shopping preferences</h2><p>Local task counts (no messages or photos sent): searches {metrics.searches || 0}, refinements {metrics.refinements || 0}, cart additions {metrics.cartAdds || 0}, handoffs {metrics.escalations || 0}, completed {metrics.completed || 0}. Completion is marked by you, not inferred from a purchase.</p><p>Save only a budget and size on this device. Addresses stay in your secure checkout account.</p><label>Budget in Kwacha<input type="number" min="1" max="999999999" value={budget} onChange={e=>setBudget(e.target.value.slice(0,12))}/></label><label>Size / device preference<input maxLength={40} value={size} onChange={e=>setSize(e.target.value)}/></label><div className="ai-actions"><button type="button" onClick={()=>{const prefs={budget:/^\d+(\.\d{1,2})?$/.test(budget)?budget:'',size:size.slice(0,40)};setSavedPrefs(prefs);try{localStorage.setItem(PREFS,JSON.stringify(prefs))}catch{}setShowPrefs(false)}}>Save preferences</button><button type="button" onClick={()=>{setSavedPrefs(null);setBudget('');setSize('');try{localStorage.removeItem(PREFS)}catch{}}}>Forget preferences</button></div><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Keep conversations in this browser tab (up to 20 chats, 30 exchanges each). Photos are saved as small previews; shared-device users can turn this off.</label><button type="button" onClick={()=>deleteChat(activeChat)}>Delete this conversation</button></section>}
          {(job==='track'||job==='return')?<section className="ai-welcome"><h2>{job==='track'?'Where is my order?':'Help with a return'}</h2><p>Use your secure order page to view tracking or review an issue before submitting a request. The AI cannot place orders, send payments or issue refunds.</p><div className="ai-actions"><Link to={job==='track'?'/track-order':'/orders'}>{job==='track'?'Track an order':'Choose an order'}</Link><Link to="/returns">Return information</Link>{support}</div><AssistantPrivateOrders/></section>:<>
          {!turns.length && <section className="ai-welcome"><p className="ai-eyebrow">ASK. UNDERSTAND. DISCOVER.</p><h2>Hey there 👋<br/>What can I <span>help you with?</span></h2><p>Ask a question, understand a concept or find something on the marketplace.</p><div className="ai-chips">{['Explain RAM','Laptop under K8,000','Gaming mouse','Track my order','Returns policy'].map(p=><button type="button" key={p} onClick={()=>draft(p)}>{p}</button>)}</div><h3>Try a starting point</h3><div className="ai-starters">{[['Explain something','Explain the difference between RAM and storage'],['Think through a choice','How should I choose between a laptop and a desktop?'],['Shop my budget','Find a laptop under K8,000'],['Compare the options','Compare phones']].map(([label,q])=><button type="button" key={label} onClick={()=>draft(q)}><Sparkles size={18}/><span>{label}</span></button>)}</div>{savedPrefs && <button type="button" onClick={()=>draft(`Find ${savedPrefs.size || 'products'}${savedPrefs.budget?' under K'+savedPrefs.budget:''}`)}>Use my saved preferences</button>}</section>}
          {turns.map((turn,index)=>{
            const latest=index===turns.length-1
            const followups=latest&&!busy?relevantAssistantFollowups(turn.reply):[]
            return <section key={turn.id} className="ai-turn" data-turn-id={turn.id}>
              <div className="ai-user">{turn.photoPreview&&<img className="ai-upload-preview" src={turn.photoPreview} alt="Uploaded product photo"/>}<p>{turn.question}</p></div>
              <div className="ai-question-tools"><button type="button" aria-label="Edit question" title="Edit question" disabled={busy} onClick={()=>{setEditingIndex(index);draft(turn.question);setNotice('Editing an earlier question. Later answers are replaced only after the revised question succeeds. Reattach a photo if needed.')}}><Pencil size={14}/></button></div>
              <div className="ai-answer"><Sparkles size={18}/><p>{turn.reply.answer}</p></div>
              {latest&&turn.reply.discovery?.basis==='general'&&!useBrowsing&&<div className="ai-chips"><button type="button" onClick={()=>{setShowHistory(false);setShowPrefs(true)}}>Personalise with my DigitalHood browsing</button></div>}
              {Boolean(turn.reply.citations?.length)&&<div className="ai-policy-sources" aria-label="Published policy sources"><strong>{turn.reply.groundedInPolicy?'Published guidance':'Read the current policy'}</strong>{turn.reply.citations?.map(c=><Link key={c.url} to={new URL(c.url).pathname+new URL(c.url).hash}>{c.title}{c.version?' · '+c.version:''}</Link>)}</div>}
              {latest&&<div className="ai-filters">{turn.reply.filters.map(f=><button type="button" disabled={busy} key={f.key} onClick={()=>void search(turn.question,[...new Set([...(turn.removeFilters||[]),f.key])])}>{turn.reply.relaxedFilters.includes(f.key)?'Relaxed: ':''}{f.label} <X size={12}/></button>)}</div>}
              {turn.reply.responseMode!=='answer'&&(turn.reply.products.length>0||turn.reply.pagination?.hasMore)&&<><div className="ai-products">{turn.reply.products.slice(0,latest?shown:4).map(p=><ProductCard key={p.id} product={p} selected={selected} cartBusy={cartBusy} draft={draft} toggleCompare={toggleCompare} prepareCart={prepareCart}/>)}</div>{latest&&<div className="ai-actions" aria-live="polite"><small>{Math.min(shown,turn.reply.products.length)} shown{turn.reply.pagination?.complete?` · ${turn.reply.pagination.matchedCount} matching`:''}</small>{(shown<turn.reply.products.length||turn.reply.pagination?.hasMore&&turn.reply.pagination.token)&&<button type="button" disabled={busy||pageBusy!==null} onClick={()=>void loadMore(turn)}>{pageBusy===turn.id?'Loading…':'Load more'}</button>}</div>}</>}
              {turn.reply.responseMode==='answer'&&turn.reply.products.length>0&&<div className="ai-chips" aria-label="Sources for this answer">{turn.reply.products.map(p=><Link key={p.id} to={new URL(p.url).pathname}>Source: {p.name.slice(0,45)}{p.name.length>45?'…':''}</Link>)}</div>}
              {followups.length>0&&<div className="ai-next-actions ai-chips" aria-label="Suggested next steps">{followups.map(label=><button type="button" key={label} onClick={()=>followup(label,turn)}>{label}</button>)}</div>}
              {latest&&!busy&&<div className="ai-answer-tools">
                {turn.reply.degraded&&!turn.reply.products.length&&<button type="button" className="ai-retry" onClick={()=>void search(turn.question,turn.removeFilters||[],index)}>Try again</button>}
                <AssistantAnswerOptions turn={turn} feedbackBusy={feedbackBusy===turn.id} onFeedback={helpful=>void submitFeedback(turn,helpful)} onNotice={setNotice} onEscalate={()=>metric('escalations')} onComplete={()=>{metric('completed');setTurns(old=>old.map(t=>t.id===turn.id?{...t,taskCompleted:true}:t));setNotice('Marked as completed on this device.')}}/>
              </div>}
            </section>
          })}
          {showComparison && <section className="ai-note"><h2>Compare your options</h2><p>{selected.length<2?'Select two to four products using their compare buttons.':'Compare only published details. Missing specifications are shown explicitly.'}</p>{selected.length>0 && <div className="ai-table-wrap"><table><caption>Selected catalogue listings</caption><thead><tr><th>Detail</th>{selected.map(p=><th key={p.id}><Link to={new URL(p.url).pathname}>{p.name}</Link><button type="button" aria-label={'Remove '+p.name+' from comparison'} onClick={()=>toggleCompare(p)}>×</button></th>)}</tr></thead><tbody><tr><th>Price</th>{selected.map(p=><td key={p.id}>{money(p.price)}</td>)}</tr><tr><th>Seller</th>{selected.map(p=><td key={p.id}>{p.sellerStoreName || 'Check listing'}</td>)}</tr>{[...new Set(selected.flatMap(p=>p.specifications.map(s=>s.label)))].slice(0,12).map(label=><tr key={label}><th>{label}</th>{selected.map(p=><td key={p.id}>{p.specifications.find(s=>s.label===label)?.value || 'Not published'}</td>)}</tr>)}</tbody></table></div>}{selected.length>=2 && <button type="button" onClick={()=>draft('Compare these selected products',selected.map(p=>p.id))}>Ask AI about these options</button>}{support}</section>}
          {selected.length>0 && !showComparison && <button type="button" onClick={()=>setShowComparison(true)}>Compare selected ({selected.length}/4)</button>}
          </>}
          {cartBusy && <p role="status" className="ai-source">Checking current price, seller and stock…</p>}
          {pendingCart && <section className="ai-note" aria-label="Confirm cart addition"><h2>Review before adding</h2><p>{pendingCart.name} · Quantity 1</p><p>{money(pendingCart.price)} · {pendingCart.sellerStoreName || pendingCart.seller?.storeName || pendingCart.sellerKey}</p><p>Delivery and fees will be checked during checkout.</p><div className="ai-actions"><button type="button" disabled={cartBusy} onClick={()=>void confirmCart()}>{cartBusy?'Checking…':'Confirm add to cart'}</button><button type="button" disabled={cartBusy} onClick={()=>{cartRequest.current++;setPendingCart(null)}}>Cancel</button>{support}</div></section>}
          {cartReview && <section className="ai-note"><h2>Your cart</h2>{items.length?items.map(item=><p key={item.id}>{item.name} · {item.quantity} × {money(item.price)} · {item.sellerStoreName || 'Seller details in cart'}</p>):<p>Your cart is empty.</p>}<p>Each seller’s availability, shipping and fees are checked in the existing cart and checkout.</p><div className="ai-actions"><Link to="/cart">Review cart & choose sellers</Link>{items.length>0 && <Link to="/checkout">Continue to secure checkout</Link>}{support}</div></section>}
          {busy && <div role="status" className="ai-turn"><div className="ai-user">{photoPreview && <img className="ai-upload-preview" src={photoPreview} alt="Product photo being searched"/>}<p>{pendingQuestion}</p></div><p>{preview || 'Thinking…'}</p><Loader2 size={20} className="animate-spin motion-reduce:animate-none"/>{/^(?:find|search|show|i (?:want|need))\b/i.test(pendingQuestion) && <div className="ai-products" aria-hidden="true">{[1,2,3].map(n=><div key={n} className="ai-product animate-pulse motion-reduce:animate-none" style={{minHeight:80,background:'var(--ai-bg)'}}/>)}</div>}</div>}
          {error && <div role="alert" className="ai-note"><p>{error}</p><div className="ai-actions"><Link to="/shop">Browse the shop</Link>{support}</div></div>}
          {notice && <p role="status" className="ai-source">{notice}</p>}

        </div>
        {compactDiscovery && browseDiscovery && <div className="ai-discovery-mobile"><AssistantDiscovery excludedIds={turns.flatMap(t=>t.reply.products.map(p=>p.id))} /></div>}
        <form hidden={compactDiscovery && browseDiscovery} className="ai-composer" onSubmit={submit}>
          {contextIds.length>0 && <p>Using {contextIds.length} selected catalogue listing(s)<button type="button" onClick={()=>setContextIds([])} aria-label="Clear selected product context"><X size={16}/></button></p>}
          {suggestions.length>0 && <div className="ai-suggestions" aria-label="Live catalogue suggestions">{suggestions.map(p=><button type="button" key={p.id} onClick={()=>{draft(p.name);setSuggestions([])}}>{p.name}<span>{money(Number(p.price))}</span></button>)}</div>}
          {editingIndex!==null && <p>Editing question {editingIndex+1}. <button type="button" onClick={()=>{setEditingIndex(null);setMessage('');setContextIds([])}}>Cancel edit</button></p>}
          {photo && <p><img className="ai-upload-preview" src={photoPreview} alt="Attached product photo"/><button type="button" aria-label="Remove attached photo" onClick={()=>{setPhoto(null);setPhotoPreview('')}}><X size={16}/></button></p>}
          {voiceNotice && <div className="ai-source">Voice uses your browser’s speech service and may send audio to its provider. Review the transcript before sending.<button type="button" onClick={startVoice}>Start voice input</button><button type="button" onClick={()=>setVoiceNotice(false)}>Cancel</button></div>}
          <label htmlFor="shopping-question" className="sr-only">Message DigitalHood AI</label><textarea ref={input} id="shopping-question" maxLength={4000} rows={2} value={message} onChange={e=>{setMessage(e.target.value)}} onFocus={()=>setFocused(true)} placeholder="Ask a question or find a product…" disabled={busy || job==='track' || job==='return'}/>
          <div className="ai-composer-actions"><div><input ref={upload} type="file" accept="image/*" className="sr-only" onChange={e=>{void attach(e.target.files?.[0]);e.target.value=''}}/><button type="button" aria-label="Attach product photo" disabled={busy || job==='track' || job==='return'} onClick={()=>upload.current?.click()}><Paperclip size={20}/></button><button type="button" aria-label={listening?'Stop voice input':'Use voice input'} aria-pressed={listening} disabled={busy || job==='track' || job==='return'} onClick={()=>listening?voice.current?.stop():setVoiceNotice(true)}><Mic size={22}/></button><button type="button" className="ai-mobile-memory" onClick={()=>setShowPrefs(v=>!v)}>Preferences</button></div><button type="submit" className="ai-send" disabled={busy || photoBusy || (message.trim().length<3 && !isAssistantAcknowledgement(message.trim())) || job==='track' || job==='return'}>{photoBusy?'Preparing…':'Send'} <Send size={16}/></button></div><small>Up to 4,000 characters · Product photos supported · Videos not supported. Never share payment secrets.</small>
        </form>
        <nav className="ai-bottom" aria-label="Mobile navigation"><button type="button" onClick={clearConversation}>New chat</button><button type="button" onClick={()=>setShowHistory(v=>!v)}>Chats</button><button type="button" onClick={()=>setCartReview(v=>!v)}>Cart</button><button type="button" onClick={()=>deleteChat(activeChat)}>Delete this chat</button></nav>
      </section>
      {!compactDiscovery && browseDiscovery && <AssistantDiscovery excludedIds={turns.flatMap(t=>t.reply.products.map(p=>p.id))} />}
    </main>
  </div><Footer /></>
}
