/**
 * NEXUS LOTO RELEASE WORKFLOW
 * Stage 7: records personal lock removal and blocks LOTO closure while locks remain.
 */
(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function api(){return window.NEXUSOneLineLayers;}
function uid(p){return p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);}
function now(){return new Date().toISOString();}
function activeLocks(d){return d.personalLocks.filter(x=>x&&String(x.status||"").toLowerCase()!=="removed");}
function activeLotos(d){return d.lotos.filter(x=>x&&String(x.status||"").toLowerCase()!=="closed");}
function install(){
 const modal=document.createElement("div");modal.className="nx-loto-start-modal";modal.setAttribute("aria-hidden","true");document.body.appendChild(modal);
 function close(){modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");modal.innerHTML="";}
 function show(html){modal.innerHTML=html;modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");}
 function removePerson(){
  if(!api()||!api().can("loto","participate"))return;const d=api().loadLoto(),locks=activeLocks(d);
  show('<div class="nx-loto-dialog nx-release-dialog"><header><div><span>PERSONAL PROTECTION</span><h2>Remove Person / Lock</h2></div><button type="button" data-cancel>×</button></header>'+(locks.length?'<form data-release-form><label>Active Personal Lock<select name="lockRecordId" required>'+locks.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.personName||l.personId)+' — '+esc(l.lockId||l.lockNumber)+' — '+esc(l.equipmentId)+'</option>').join("")+'</select></label><label>Removed By<input name="removedBy" required placeholder="Person removing their physical lock"></label><label class="nx-loto-confirm"><input type="checkbox" name="physicalRemoved" required><span>The physical personal lock has been removed by its authorized owner or through the approved exception process. NEXUS is only recording the field action.</span></label><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Record Lock Removal</button></footer></form>':'<div class="nx-lock-message">There are no active personal locks to remove.</div><footer class="nx-lock-footer"><button type="button" data-cancel>Close</button></footer>')+'</div>');
 }
 function closeLoto(){
  if(!api()||!api().can("loto","manage"))return;const d=api().loadLoto(),lotos=activeLotos(d);
  show('<div class="nx-loto-dialog nx-release-dialog"><header><div><span>RESTORATION CONTROL</span><h2>Close LOTO</h2></div><button type="button" data-cancel>×</button></header>'+(lotos.length?'<form data-close-form><label>Active LOTO<select name="lotoId" required>'+lotos.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.lotoNumber||l.id)+' — '+esc(l.equipmentId||"Equipment")+'</option>').join("")+'</select></label><label>Closed By<input name="closedBy" required placeholder="Controlling authorized person"></label><label class="nx-loto-confirm"><input type="checkbox" name="restorationConfirmed" required><span>I am recording completion of the approved release/restoration process. NEXUS does not establish an electrically safe condition.</span></label><div class="nx-close-blockers" aria-live="polite"></div><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Close LOTO</button></footer></form>':'<div class="nx-lock-message">There are no active LOTOs to close.</div><footer class="nx-lock-footer"><button type="button" data-cancel>Close</button></footer>')+'</div>');
  const sel=modal.querySelector('[name="lotoId"]');if(sel){sel.addEventListener("change",renderBlockers);renderBlockers();}
 }
 function renderBlockers(){const sel=modal.querySelector('[name="lotoId"]'),box=modal.querySelector(".nx-close-blockers");if(!sel||!box)return;const locks=activeLocks(api().loadLoto()).filter(l=>String(l.lotoId)===sel.value);box.innerHTML=locks.length?'<strong>Closure blocked — '+locks.length+' personal lock'+(locks.length===1?'':'s')+' remain</strong>'+locks.map(l=>'<div><b>'+esc(l.personName||l.personId)+'</b><span>'+esc(l.lockId||l.lockNumber)+' · '+esc(l.equipmentId)+'</span></div>').join(""):'<strong class="clear">No active personal locks recorded on this LOTO.</strong>';}
 modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-cancel]"))close();});
 modal.addEventListener("submit",e=>{
  e.preventDefault();const form=e.target,fd=new FormData(form),d=api().loadLoto();
  if(form.hasAttribute("data-release-form")){const lock=d.personalLocks.find(l=>l.id===fd.get("lockRecordId")&&String(l.status||"").toLowerCase()!=="removed");if(!lock){alert("That personal lock is no longer active.");return;}const t=now(),actor=String(fd.get("removedBy")||"").trim();lock.status="removed";lock.removedAt=t;lock.removedBy=actor;lock.physicalStateRecorded="removed";d.events.push({id:uid("event"),type:"PERSONAL_LOCK_REMOVED",timestamp:t,actor,personId:lock.personId,personName:lock.personName,layer:"loto",recordId:lock.id,lotoId:lock.lotoId,lotoNumber:lock.lotoNumber,equipmentId:lock.equipmentId,lockId:lock.lockId,payload:{physicalState:"removed"}});api().saveLoto(d);close();return;}
  if(form.hasAttribute("data-close-form")){const loto=d.lotos.find(l=>l.id===fd.get("lotoId")&&String(l.status||"").toLowerCase()!=="closed");if(!loto){alert("That LOTO is no longer active.");return;}const blockers=activeLocks(d).filter(l=>String(l.lotoId)===loto.id);if(blockers.length){renderBlockers();return;}const t=now(),actor=String(fd.get("closedBy")||"").trim();loto.status="closed";loto.closedAt=t;loto.closedBy=actor;loto.updatedAt=t;loto.updatedBy=actor;d.events.push({id:uid("event"),type:"LOTO_CLOSED",timestamp:t,actor,layer:"loto",recordId:loto.id,lotoId:loto.id,lotoNumber:loto.lotoNumber,equipmentId:loto.equipmentId,isolationPoint:loto.isolationPoint,payload:{status:"closed",restorationProcessRecorded:true}});api().saveLoto(d);close();}
 });
 window.addEventListener("nexus:loto-remove-person-request",removePerson);window.addEventListener("nexus:loto-close-request",closeLoto);window.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();