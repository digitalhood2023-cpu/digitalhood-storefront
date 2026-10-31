import {useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAccount} from '@/context/AccountContext'
import {getCustomerOrders} from '@/api/account'
import {ACCOUNT_STATE_CLEARED_EVENT} from '@/lib/marketplaceBrowserState'

type Order={id:number;number:string;status:string}
export default function AssistantPrivateOrders(){
 const {customer,isAuthenticated,isLoading}=useAccount()
 const [orders,setOrders]=useState<Order[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const generation=useRef(0)
 useEffect(()=>{const clear=()=>{generation.current++;setOrders(null);setBusy(false);setError('')};clear();window.addEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear);return ()=>{generation.current++;window.removeEventListener(ACCOUNT_STATE_CLEARED_EVENT,clear)}},[customer?.id])
 async function load(){const current=++generation.current;setBusy(true);setError('');try{const response=await getCustomerOrders({page:1,perPage:5});if(current!==generation.current)return;if(!response?.success||!Array.isArray(response.orders))throw Error();setOrders(response.orders.filter(o=>Number.isSafeInteger(o.id)&&o.id>0).slice(0,5).map(o=>({id:o.id,number:String(o.number||o.id).slice(0,40),status:String(o.statusLabel||o.status||'Check order').slice(0,80)})))}catch{if(current===generation.current)setError('Your orders could not be loaded. Retry or open My orders.')}finally{if(current===generation.current)setBusy(false)}}
 return <div className="ai-private-orders"><strong>Secure account tools · not AI inference</strong><p>Nothing here is sent to an AI model or saved in chat history. Review eligibility and confirm any request on the order page. Approval and refund payment are separate.</p>{isLoading?<p role="status">Checking sign-in…</p>:!isAuthenticated?<Link to="/account">Sign in to view your orders</Link>:<><button type="button" disabled={busy} onClick={()=>void load()}>{busy?'Checking your orders…':'Show my recent orders'}</button>{error&&<p role="alert">{error}</p>}{orders&&<ul>{orders.length?orders.map(o=><li key={o.id}><Link to={'/orders/'+o.id}>Order #{o.number}</Link><span>{o.status}</span></li>):<li>No recent orders were returned. Open My orders to check all purchases.</li>}</ul>}</>}<div className="ai-actions"><Link to="/orders">My orders</Link><Link to="/account/support-cases">My support cases</Link></div></div>
}
