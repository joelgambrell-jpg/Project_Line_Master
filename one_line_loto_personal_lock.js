/**
 * NEXUS LOTO PERSONAL LOCK WORKFLOW
 * Stage 6: person + physical personal lock participation on an active LOTO.
 */
(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function api(){return window.NEXUSOneLineLayers;}
function uid(p){return p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);}
function now(){return new Date().toISOString();}
function selectedId(){const n=document.querySelector(".nexus-one-line .node.selected");return n?String((n.querySelector(".id")&&n.querySelector(".id").textContent)||"").trim():"";}
function activeLotos(d){return d.lotos.filter(x=>x&&String(x.status||"").toLowerCase()!=="closed");}
function install(){
 const modal=document.createElement("div");modal.className="nx-loto-start-modal";modal.setAttribute("aria-hidden","true");document.body.appendChild(modal);
 function close(){modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");modal.innerHTML="";}
 function open(){
  if(!api()||!api().can("loto","participate"))return;
  const d=api().loadLoto(),lotos=activeLotos(d),selected=selectedId();
  if(!lotos.length){modal.innerHTML='<div class="nx-loto-dialog nx-lock-dialog"><header><div><span>PERSONAL PROTECTION</span><h2>No Active LOTO</h2></div><button type="button" data-cancel>×</button></header><div class="nx-lock-message">A personal lock must be associated with an active controlling LOTO record in this workflow.</div><footer class="nx-lock-footer"><button type="button" data-cancel>Close</button></footer></div>';modal.classList.add("is-open");return;}
  const preferred=lotos.find(l=>selected&&(String(l.equipmentId)===selected||(l.protectedEquipmentIds||[]).map(String).includes(selected)))||lotos[0];
  modal.innerHTML='<div class="nx-loto-dialog nx-lock-dialog" role="dialog" aria-modal="true"><header><div><span>PERSONAL PROTECTION</span><h2>Add Person / Lock</h2></div><button type="button" data-cancel>×</button></header><form>'+
   '<label>Controlling LOTO<select name="lotoId" required>'+lotos.map(l=>'<option '+(l.id===preferred.id?'selected ':'')+'value="'+esc(l.id)+'">'+esc(l.lotoNumber||l.id)+' — '+esc(l.equipmentId||"Equipment")+'</option>').join("")+'</select></label>'+
   '<label>Work Equipment<input name="equipmentId" required value="'+esc(selected||preferred.equipmentId||"")+'" placeholder="Equipment ID"><small>This must be equipment covered by the selected LOTO.</small></label>'+
   '<div class="nx-loto-form-row"><label>Person Name<input name="personName" required autocomplete="name"></label><label>Person ID<input name="personId" placeholder="Employee / authorized-person ID"></label></div>'+
   '<div class="nx-loto-form-row"><label>Company / Employer<input name="company" placeholder="Organization"></label><label>Personal Lock ID<input name="lockId" required placeholder="Scan or enter physical lock ID"></label></div>'+
   '<label class="nx-loto-confirm"><input type="checkbox" name="physicalApplied" required><span>The named person has physically applied and controls this personal lock. This digital record does not apply, remove, or control the physical lock.</span></label>'+
   '<footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Record Personal Lock</button></footer></form></div>';
  modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");
 }
 modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-cancel]"))close();});
 modal.addEventListener("submit",e=>{
  e.preventDefault();const form=e.target;if(!form.reportValidity())return;const fd=new FormData(form),d=api().loadLoto(),loto=d.lotos.find(x=>x.id===fd.get("lotoId")&&String(x.status||"").toLowerCase()!=="closed");if(!loto){alert("The selected LOTO is no longer active.");return;}
  const equipmentId=String(fd.get("equipmentId")||"").trim(),covered=new Set([loto.equipmentId,...(loto.equipmentIds||[]),...(loto.protectedEquipmentIds||[])].filter(Boolean).map(String));if(!covered.has(equipmentId)){alert("That equipment is not recorded inside the selected LOTO boundary.");return;}
  const lockId=String(fd.get("lockId")||"").trim();if(d.personalLocks.some(l=>String(l.status||"").toLowerCase()!=="removed"&&String(l.lockId||l.lockNumber||"")===lockId)){alert("That personal lock ID is already active.");return;}
  const appliedAt=now(),personName=String(fd.get("personName")||"").trim(),personId=String(fd.get("personId")||"").trim()||uid("person");
  const lock={id:uid("personal-lock"),lotoId:loto.id,lotoNumber:loto.lotoNumber,status:"active",equipmentId,personId,personName,company:String(fd.get("company")||"").trim(),lockId,appliedAt,appliedBy:personName,ownerLayer:"loto",physicalStateRecorded:"applied"};
  d.personalLocks.push(lock);d.events.push({id:uid("event"),type:"PERSONAL_LOCK_APPLIED",timestamp:appliedAt,actor:personName,personId,personName,layer:"loto",recordId:lock.id,lotoId:loto.id,lotoNumber:loto.lotoNumber,equipmentId,lockId,payload:{company:lock.company,physicalState:"applied"}});
  api().saveLoto(d);close();
 });
 window.addEventListener("nexus:loto-add-person-request",open);window.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();