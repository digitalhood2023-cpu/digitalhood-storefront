import {useRef} from 'react'
import {Link} from 'react-router-dom'
import {MoreHorizontal,Copy,ThumbsUp,ThumbsDown,Flag,Check} from 'lucide-react'
import type {ChatTurn} from '@/lib/shoppingAssistant'

export default function AssistantAnswerOptions({turn,feedbackBusy,onFeedback,onNotice,onEscalate,onComplete}:{
  turn:ChatTurn;feedbackBusy:boolean;onFeedback:(helpful:boolean)=>void;
  onNotice:(message:string)=>void;onEscalate:()=>void;onComplete:()=>void;
}){
  const disclosure=useRef<HTMLDetailsElement>(null)
  async function copyAnswer(){
    try{await navigator.clipboard.writeText(turn.reply.answer);onNotice('Answer copied.');if(disclosure.current)disclosure.current.open=false}
    catch{onNotice('Copy is unavailable in this browser. You can select the answer text instead.')}
  }
  return <details className="ai-answer-options" ref={disclosure} onKeyDown={event=>{if(event.key==='Escape'&&disclosure.current){disclosure.current.open=false;disclosure.current.querySelector('summary')?.focus()}}}>
    <summary aria-label="Answer options"><MoreHorizontal size={17}/><span>Answer options</span></summary>
    <div className="ai-answer-menu ai-note">
      <button type="button" onClick={()=>void copyAnswer()}><Copy size={15}/>Copy answer</button>
      <div className="ai-feedback-options" aria-label="Optional answer feedback">
        <button type="button" aria-label="Helpful answer" aria-pressed={turn.feedback==='up'} disabled={Boolean(turn.feedback)||feedbackBusy} onClick={()=>onFeedback(true)}><ThumbsUp size={15}/>Helpful</button>
        <button type="button" aria-label="Unhelpful answer" aria-pressed={turn.feedback==='down'} disabled={Boolean(turn.feedback)||feedbackBusy} onClick={()=>onFeedback(false)}><ThumbsDown size={15}/>Needs work</button>
      </div>
      <Link to="/support" onClick={onEscalate}><Flag size={15}/>Report a problem</Link>
      {turn.reply.products.length>0&&<button type="button" disabled={turn.taskCompleted} onClick={onComplete}><Check size={15}/>{turn.taskCompleted?'Task completed':'Mark task complete'}</button>}
    </div>
  </details>
}
