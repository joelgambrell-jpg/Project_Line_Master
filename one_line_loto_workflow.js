/**
 * NEXUS LOTO START WORKFLOW
 * Stage 5: creates a LOTO-owned operational record + immutable creation event.
 * Does not assert electrical safety and does not alter SME topology.
 */
(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function selectedId(){const n=document.querySelector(".nexus-one-line .node.selected");return n?String((n.querySelector(".id")&&n.querySelector(".id").textContent)||"").trim():"";}
function equipmentIds(){return Array.from(document.querySelectorAll(".nexus-one-line .node .id")).map(x=>String(x.textContent||"").trim()).filter(Boolean);}
function uid(prefix){return prefix+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);}
function now(){return new Date().toISOString();}
function api(){return window.NEXUSOneLineLayers;}
function install(){
 const modal=document.createElement("div");modal.className="nx-loto-start-modal";modal.setAttribute("aria-hidden","true");document.body.appendChild(modal);
 function close(){modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");modal.innerHTML="";}
 function open(){
  if(!api()||!api().can("loto","manage"))return;
  const ids=equipmentIds(),selected=selectedId();
  modal.innerHTML='<div class="nx-loto-dialog" role="dialog" aria-modal="true" aria-labelledby="nxStartLotoTitle"><header><div><span>RECORDED LOTO</span><h2 id="nxStartLotoTitle">Start LOTO</h2></div><button type="button" data-cancel aria-label="Cancel">×</button></header>'+
  '<form><div class="nx-loto-step"><strong>1</strong><span>Selected Equipment</span></div><label>Work Equipment<select name="equipmentId" required><option value="">Select equipment</option>'+ids.map(id=>'<option '+(id===selected?'selected ':'')+'value="'+esc(id)+'">'+esc(id)+'</option>').join("")+'</select></label>'+
  '<div class="nx-loto-step"><strong>2</strong><span>LOTO Information</span></div>'+
  '<div class="nx-loto-form-row"><label>LOTO #<input name="lotoNumber" required placeholder="LOTO-0264"></label><label>LOTO Coordinator<input name="lotoCoordinator" required placeholder="Name"></label></div>'+
  '<label>Work / Scope Description<textarea name="scope" rows="3" required placeholder="Describe the equipment and work covered by this LOTO"></textarea></label>'+
  '<label class="nx-loto-confirm"><input type="checkbox" name="fieldVerified" required><span>I am recording the approved field isolation information. This software record does not replace physical LOTO verification.</span></label>'+
  '<div class="nx-loto-step"><strong>3</strong><span>Continue to Guided Isolation</span></div><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">CREATE & CONTINUE</button></footer></form></div>';
  modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");
 }
 modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-cancel]"))close();});
 modal.addEventListener("submit",e=>{
  e.preventDefault();const form=e.target;if(!form.reportValidity())return;const fd=new FormData(form),createdAt=now(),id=uid("loto"),actor=String(fd.get("lotoCoordinator")||"").trim();
  const record={id,lotoNumber:String(fd.get("lotoNumber")||"").trim(),status:"active",equipmentId:String(fd.get("equipmentId")||"").trim(),equipmentIds:[String(fd.get("equipmentId")||"").trim()],isolationPoint:"",isolationPoints:[],lotoCoordinator:actor,scope:String(fd.get("scope")||"").trim(),fieldVerificationRecorded:true,createdAt,createdBy:actor,ownerLayer:"loto"};
  const d=api().loadLoto();d.lotos.push(record);d.events.push({id:uid("event"),type:"LOTO_CREATED",timestamp:createdAt,actor,layer:"loto",recordId:id,lotoNumber:record.lotoNumber,equipmentId:record.equipmentId,payload:{scope:record.scope,status:"active"}});
  api().saveLoto(d);close();setTimeout(()=>window.dispatchEvent(new CustomEvent("nexus:loto-isolation-request",{detail:{lotoId:id,equipmentId:record.equipmentId}})),0);
 });
 window.addEventListener("nexus:loto-start-request",open);window.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();