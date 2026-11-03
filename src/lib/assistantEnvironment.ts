// Coarse first-party product topics only; no raw history/identifiers leave here.
// Keep these public keys aligned with the AI service's discovery topic contract.
const topics:[string,RegExp][]=[['phone-case',/\b(?:cases?|covers?|screen protectors?)\b/i],['wireless-charger',/wireless charg|magsafe|\bqi2?\b/i],['charger',/charg|power adapter/i],['mouse',/\b(?:mouse|mice)\b/i],['keyboard',/keyboard/i],['speakerphone',/speakerphone/i],['headphones',/headphone|headset|earbuds?/i],['monitor',/monitor/i],['printer',/printer/i],['router',/router|networking|wifi|wi fi/i],['storage',/\bssd\b|storage|flash drive/i],['ram',/\bram\b|memory/i],['desktop',/desktop|all.in.one|\baio\b/i],['laptop',/laptop|notebook|ideapad|thinkpad|probook|expertbook/i],['tablet',/tablet|ipad/i],['phone',/phone|iphone|smartphone/i],['speaker',/speaker/i],['camera',/camera/i],['gaming',/playstation|xbox|gaming console/i],['watch',/smartwatch|smart watch/i],['cable',/cable/i]]
// Full device titles include RAM/SSD specifications; those are not separate
// browsing interests. Keep clearly named parts/accessories in their own topic.
function topicFor(text:string){
 const accessory=/\b(?:chargers?|adapters?|power suppl(?:y|ies)|cables?|cases?|covers?|replacement|keyboards?|mice|mouse|stands?|mounts?|screens?|batter(?:y|ies)|bags?|sleeves?|printers?|hubs?|docking|sodimm|modules?|headphones?|headsets?|earbuds?|speakerphones?|monitors?|routers?)\b|^(?:ddr[3-6]|(?:laptop|computer|pc)\s+(?:ram|memory|ssd))/i.test(text)
 if(!accessory){
  if(/\b(?:desktop|all.in.one|aio|mini.pc|ideacentre)\b/i.test(text))return 'desktop'
  if(/\b(?:laptops?|notebooks?|macbooks?|ideapad|thinkpad|probook|expertbook|vivobook|zenbook|latitude|inspiron)\b/i.test(text))return 'laptop'
  if(/\b(?:tablets?|ipad)\b/i.test(text))return 'tablet'
  if(/\b(?:phones?|iphone|smartphone)\b/i.test(text))return 'phone'
 }
 return topics.find(([,pattern])=>pattern.test(text))?.[0]
}
export function assistantEnvironment({enabled,readSearches,recentlyViewed=[]}:{enabled:boolean;readSearches?:()=>string[];recentlyViewed?:{name?:string;category?:string}[]}){
 let timeZone='Africa/Lusaka'
 try{timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||timeZone}catch{/* Safe server default. */}
 const discoveryInterests:string[]=[]
 if(enabled){
  let searches:string[]=[];try{const value=readSearches?.();if(Array.isArray(value))searches=value.slice(0,20)}catch{/* Local storage unavailable. */}
  for(const raw of [...searches,...recentlyViewed.slice(0,30).map(p=>[p.category,p.name].filter(Boolean).join(' '))]){
   if(typeof raw!=='string'||/@|https?:\/\/|\b(?:password|passcode|pin|otp|api[ _-]?key|order|refund|payment|case\s*#)\b|(?:\+260|\b0[79])\d{7,}/i.test(raw))continue
   const topic=topicFor(raw.slice(0,250))
   if(topic&&!discoveryInterests.includes(topic))discoveryInterests.push(topic)
   if(discoveryInterests.length===3)break
  }
 }
 return {timeZone,discoveryInterests}
}
