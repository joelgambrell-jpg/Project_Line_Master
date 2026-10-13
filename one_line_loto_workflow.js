/* LOTO people, locks and release workflow
 * Consolidated from: one_line_loto_people.js, one_line_loto_workflow.js, one_line_loto_group_box.js, one_line_loto_personal_lock.js, one_line_loto_release.js, one_line_loto_history.js.
 * Parts run in the original load order. */
/* ---- one_line_loto_people.js ---- */
/**
 * NEXUS LOTO PEOPLE VIEW
 * Stage 4: reverse lookup from person -> active equipment and personal locks.
 */
(function(){
"use strict";
const mounted=new WeakSet();
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function data(){return window.NEXUSOneLineLayers&&window.NEXUSOneLineLayers.loadLoto?window.NEXUSOneLineLayers.loadLoto():{lotos:[],personalLocks:[]};}
function activeLocks(){return data().personalLocks.filter(x=>x&&String(x.status||"").toLowerCase()!=="removed");}
function groupPeople(locks){const m=new Map();locks.forEach(l=>{const key=String(l.personId||l.personName||l.lockId||"unknown");if(!m.has(key))m.set(key,{id:key,name:l.personName||l.personId||"Unknown person",company:l.company||"",locks:[]});m.get(key).locks.push(l);});return Array.from(m.values()).sort((a,b)=>a.name.localeCompare(b.name));}
function selectEquipment(root,id){const nodes=Array.from(root.querySelectorAll(".node"));const node=nodes.find(n=>String(n.dataset.equipmentId||(n.querySelector(".id")&&n.querySelector(".id").textContent)||"").trim()===String(id));if(!node)return false;node.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true,view:window}));node.scrollIntoView({block:"center",inline:"center"});return true;}
function install(root){
 if(!root||mounted.has(root))return;mounted.add(root);
 const sheet=document.createElement("section");sheet.className="nx-loto-people-sheet";sheet.setAttribute("aria-label","People on LOTO");document.body.appendChild(sheet);
 let query="";
 function render(){
  const visible=document.body.dataset.nexusLayer==="loto"&&sheet.classList.contains("requested");sheet.classList.toggle("is-open",visible);if(!visible)return;
  const people=groupPeople(activeLocks()).filter(p=>{const q=query.toLowerCase();return !q||p.name.toLowerCase().includes(q)||p.company.toLowerCase().includes(q)||p.locks.some(l=>String(l.equipmentId||"").toLowerCase().includes(q)||String(l.lockId||l.lockNumber||"").toLowerCase().includes(q));});
  sheet.innerHTML='<header><div><span>LOTO</span><h2>People on LOTO</h2></div><button type="button" data-close aria-label="Close people view">×</button></header><div class="nx-people-search"><input type="search" value="'+esc(query)+'" placeholder="Find person, equipment, or lock" autocomplete="off"></div><div class="nx-people-results">'+(people.length?people.map(personHtml).join(""):'<div class="nx-people-none">No active LOTO relationships match this search.</div>')+'</div>';
  const input=sheet.querySelector("input");input.addEventListener("input",e=>{query=e.target.value;render();const next=sheet.querySelector("input");if(next){next.focus();next.setSelectionRange(query.length,query.length);}});
 }
 function personHtml(p){const equipment=new Set(p.locks.map(l=>l.equipmentId).filter(Boolean));return '<article class="nx-person-card"><div class="nx-person-id"><strong>'+esc(p.name)+'</strong><span>'+esc(p.company||"Company not recorded")+'</span></div><div class="nx-person-counts"><b>'+equipment.size+'</b><span>Equipment</span><b>'+p.locks.length+'</b><span>Locks</span></div><div class="nx-person-relations">'+p.locks.map(l=>'<button type="button" data-equipment="'+esc(l.equipmentId||"")+'"><strong>'+esc(l.equipmentId||"Unknown equipment")+'</strong><span>'+esc(l.lockId||l.lockNumber||"LOCK")+'</span></button>').join("")+'</div></article>';}
 sheet.addEventListener("click",e=>{if(e.target.closest("[data-close]")){sheet.classList.remove("requested");render();return;}const b=e.target.closest("[data-equipment]");if(b){const id=b.dataset.equipment;if(selectEquipment(root,id)){sheet.classList.remove("requested");render();}}});
 window.addEventListener("nexus:loto-find-request",()=>{sheet.classList.add("requested");render();setTimeout(()=>sheet.querySelector("input")&&sheet.querySelector("input").focus(),0);});
 window.addEventListener("nexus:layerchange",e=>{if(!e.detail||e.detail.layer!=="loto")sheet.classList.remove("requested");render();});
 window.addEventListener("nexus:loto-change",render);window.addEventListener("storage",render);
}
function scan(){document.querySelectorAll(".nexus-one-line").forEach(install);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
;
/* ---- one_line_loto_workflow.js ---- */
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
;
/* ---- one_line_loto_group_box.js ---- */
/**
 * NEXUS LOTO GROUP BOX RECORDS
 * Records physical group boxes and custody of isolation-device control-lock keys.
 */
(function(){"use strict";
function api(){return window.NEXUSOneLineLayers;}function uid(p){return p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);}function now(){return new Date().toISOString();}
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function boxes(l){if(!Array.isArray(l.groupBoxes))l.groupBoxes=[];return l.groupBoxes;}
function install(){const m=document.createElement("div");m.className="nx-loto-start-modal";document.body.appendChild(m);function close(){m.classList.remove("is-open");m.innerHTML="";}
function open(){const d=api().loadLoto(),ls=d.lotos.filter(x=>x&&x.status!=="closed");m.innerHTML='<div class="nx-loto-dialog"><header><div><span>GROUP PROTECTION</span><h2>Group Boxes</h2></div><button data-cancel>×</button></header>'+(ls.length?'<label>Recorded LOTO<select data-loto>'+ls.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.lotoNumber||l.id)+'</option>').join("")+'</select></label><div data-boxes></div>':'<div class="nx-lock-message">No active Recorded LOTO.</div>')+'</div>';m.classList.add("is-open");const s=m.querySelector("[data-loto]");if(s){s.addEventListener("change",render);render();}}
function render(){const d=api().loadLoto(),l=d.lotos.find(x=>x.id===m.querySelector("[data-loto]")?.value),host=m.querySelector("[data-boxes]");if(!l||!host)return;const bs=boxes(l);host.innerHTML=bs.map(b=>{const personal=d.personalLocks.filter(x=>x&&x.status!=="removed"&&x.lotoId===l.id&&x.protectionMethod==="group_box"&&x.groupBoxId===b.groupBoxId);return '<article class="nx-isolation-point"><strong>'+esc(b.groupBoxId)+'</strong><small>Recorded by '+esc(b.createdBy)+' · '+esc(new Date(b.createdAt).toLocaleString())+'</small><div><span>'+b.controlLockIds.length+' control-lock key'+(b.controlLockIds.length===1?"":"s")+' recorded in box</span><span>'+personal.length+' active personal lock'+(personal.length===1?"":"s")+' on box</span></div><small>Control locks: '+esc(b.controlLockIds.join(", ")||"None")+'</small>'+(b.status!=="cleared"?'<button data-box-custody="'+esc(b.id)+'">Record Personal Locks Removed / Key Custody</button>':'<small>Custody record: '+esc(b.clearedBy||"")+' · '+esc(new Date(b.clearedAt).toLocaleString())+'</small>')+'</article>';}).join("")+'<button data-add-box>+ Add Group Box</button>';}
m.addEventListener("click",e=>{if(e.target.closest("[data-cancel]"))return close();const d=api().loadLoto(),l=d.lotos.find(x=>x.id===m.querySelector("[data-loto]")?.value);if(!l)return;const clear=e.target.closest("[data-clear-box]");if(clear){const b=boxes(l).find(x=>x.id===clear.dataset.clearBox);if(!b)return;const activePersonal=d.personalLocks.filter(x=>x&&x.status!=="removed"&&x.lotoId===l.id&&x.protectionMethod==="group_box"&&x.groupBoxId===b.groupBoxId);if(activePersonal.length)return alert("This group box still has "+activePersonal.length+" active personal lock"+(activePersonal.length===1?"":"s")+".");const actor=prompt("LOTO Coordinator recording group box clear:","");if(!actor)return;const note=prompt("Group box clear / control-key custody note:","");if(!note||!note.trim())return;const t=now();b.status="cleared";b.clearedAt=t;b.clearedBy=actor;b.clearNote=note.trim();d.events.push({id:uid("event"),type:"LOTO_GROUP_BOX_CLEARED",timestamp:t,actor,layer:"loto",lotoId:l.id,lotoNumber:l.lotoNumber,recordId:b.id,payload:{groupBoxId:b.groupBoxId,controlLockIds:b.controlLockIds,note:b.clearNote}});api().saveLoto(d);render();return;}const custody=e.target.closest("[data-box-custody]");if(custody){const b=boxes(l).find(x=>x.id===custody.dataset.boxCustody);if(!b)return;const activePersonal=d.personalLocks.filter(x=>x&&x.status!=="removed"&&x.lotoId===l.id&&x.protectionMethod==="group_box"&&x.groupBoxId===b.groupBoxId);if(activePersonal.length)return alert("This group box still has recorded active personal locks.");const actor=prompt("LOTO Coordinator recording key custody:","");if(!actor)return;if(l.lotoCoordinator&&actor!==String(l.lotoCoordinator).trim())return alert("This Recorded LOTO is assigned to "+l.lotoCoordinator+". Use Coordinator Handoff before another Coordinator records this action.");const note=prompt("Record the control-lock key custody / return condition:","");if(!note||!note.trim())return;const t=now();b.status="cleared";b.clearedAt=t;b.clearedBy=actor;b.clearNote=note.trim();d.events.push({id:uid("event"),type:"LOTO_GROUP_BOX_CUSTODY_RECORDED",timestamp:t,actor,layer:"loto",lotoId:l.id,lotoNumber:l.lotoNumber,recordId:b.id,payload:{groupBoxId:b.groupBoxId,controlLockIds:b.controlLockIds,note:b.clearNote}});api().saveLoto(d);render();return;}if(!e.target.closest("[data-add-box]"))return;const id=prompt("Group Box ID / number:","");if(!id)return;if(boxes(l).some(b=>b.groupBoxId===id))return alert("That group box is already recorded on this LOTO.");const available=(l.isolationPoints||[]).filter(p=>p.locked&&p.controlLockId).map(p=>p.controlLockId);if(!available.length)return alert("Record isolation-point control locks before creating the group box record.");const selected=prompt("Control lock IDs whose keys are placed in this group box (comma separated):",available.join(", "));if(!selected)return;const ids=selected.split(",").map(x=>x.trim()).filter(Boolean);const invalid=ids.filter(x=>!available.includes(x));if(invalid.length)return alert("These control locks are not recorded on the LOTO isolation points: "+invalid.join(", "));const actor=prompt("LOTO Coordinator recording group box:","");if(!actor)return;if(l.lotoCoordinator&&actor!==String(l.lotoCoordinator).trim())return alert("This Recorded LOTO is assigned to "+l.lotoCoordinator+". Use Coordinator Handoff before another Coordinator records this action.");const note=prompt("Required note for creating this group box record:","");if(!note||!note.trim())return;const t=now(),b={id:uid("group-box"),groupBoxId:id,controlLockIds:ids,createdAt:t,createdBy:actor,status:"active"};boxes(l).push(b);d.events.push({id:uid("event"),type:"LOTO_GROUP_BOX_RECORDED",timestamp:t,actor,layer:"loto",lotoId:l.id,lotoNumber:l.lotoNumber,recordId:b.id,payload:{groupBoxId:id,controlLockIds:ids,note:note.trim()}});api().saveLoto(d);render();});
window.addEventListener("nexus:loto-group-box-request",open);window.addEventListener("keydown",e=>{if(e.key==="Escape"&&m.classList.contains("is-open"))close();});}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
;
/* ---- one_line_loto_personal_lock.js ---- */
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
function activeLotos(d){return d.lotos.filter(x=>x&&String(x.status||"").toLowerCase()!=="closed");}function sig(list){return (Array.isArray(list)?list:[]).map(x=>String(x.id||"")+"|"+String(x.from||"")+"|"+String(x.to||"")).sort().join(";;");}function related(l,list){const b=l.boundaryAcceptance||{},ids=new Set([...(b.downstreamEquipmentIds||[]),...(b.isolationPointSnapshot||[]).map(p=>p.equipmentId),...(b.additionalIncomingConnections||[]).flatMap(x=>[x.from,x.to])].filter(Boolean).map(String));return (Array.isArray(list)?list:[]).filter(x=>ids.has(String(x.from||""))||ids.has(String(x.to||"")));}function acceptedCurrent(l){if(!l.boundaryAcceptance||!l.boundaryAcceptance.accepted)return false;const s=window.NEXUSLotoTopology&&window.NEXUSLotoTopology.getState?window.NEXUSLotoTopology.getState():null;return !!(s&&sig(related(l,s.connections))===sig(related(l,l.boundaryAcceptance.topologyConnections)));}function coverage(l){const a=l.boundaryAcceptance;return new Set([l.equipmentId,...(l.equipmentIds||[]),...(a&&a.downstreamEquipmentIds||[])].filter(Boolean).map(String));}
function install(){
 const modal=document.createElement("div");modal.className="nx-loto-start-modal";modal.setAttribute("aria-hidden","true");document.body.appendChild(modal);
 function close(){modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");modal.innerHTML="";}
 function open(){
  if(!api()||!api().can("loto","participate"))return;
  const d=api().loadLoto(),lotos=activeLotos(d),selected=selectedId();
  if(!lotos.length){modal.innerHTML='<div class="nx-loto-dialog nx-lock-dialog"><header><div><span>PERSONAL PROTECTION</span><h2>No Active LOTO</h2></div><button type="button" data-cancel>×</button></header><div class="nx-lock-message">A personal lock must be associated with an active controlling LOTO record in this workflow.</div><footer class="nx-lock-footer"><button type="button" data-cancel>Close</button></footer></div>';modal.classList.add("is-open");return;}
  const preferred=lotos.find(l=>selected&&coverage(l).has(selected))||lotos[0];
  modal.innerHTML='<div class="nx-loto-dialog nx-lock-dialog" role="dialog" aria-modal="true"><header><div><span>PERSONAL PROTECTION</span><h2>Add Person / Lock</h2></div><button type="button" data-cancel>×</button></header><form>'+
   '<label>Controlling LOTO<select name="lotoId" required>'+lotos.map(l=>'<option '+(l.id===preferred.id?'selected ':'')+'value="'+esc(l.id)+'">'+esc(l.lotoNumber||l.id)+' — '+esc(l.equipmentId||"Equipment")+'</option>').join("")+'</select></label>'+
   '<label>Work Equipment<input name="equipmentId" required value="'+esc(selected||preferred.equipmentId||"")+'" placeholder="Equipment ID"><small>This must be equipment covered by the selected LOTO.</small></label>'+
   '<div class="nx-loto-form-row"><label>Person Name<input name="personName" required autocomplete="name"></label><label>Person ID<input name="personId" placeholder="Employee / authorized-person ID"></label></div>'+
   '<div class="nx-loto-form-row"><label>Company / Employer<input name="company" placeholder="Organization"></label><label>Personal Lock ID<input name="lockId" required placeholder="Scan or enter physical lock ID"></label></div><div class="nx-loto-form-row"><label>Protection Method<select name="protectionMethod" required><option value="single">Single / Direct Personal Lock</option><option value="group_box">Group Box Personal Lock</option></select></label><label>Group Box ID<input name="groupBoxId" placeholder="Required for group box"></label></div>'+
   '<label class="nx-loto-confirm"><input type="checkbox" name="physicalApplied" required><span>The named person has physically applied and controls this personal lock. This digital record does not apply, remove, or control the physical lock.</span></label>'+
   '<footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Record Personal Lock</button></footer></form></div>';
  modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");
 }
 modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-cancel]"))close();});
 modal.addEventListener("submit",e=>{
  e.preventDefault();const form=e.target;if(!form.reportValidity())return;const fd=new FormData(form),d=api().loadLoto(),loto=d.lotos.find(x=>x.id===fd.get("lotoId")&&String(x.status||"").toLowerCase()!=="closed");if(!loto){alert("The selected LOTO is no longer active.");return;}
  const equipmentId=String(fd.get("equipmentId")||"").trim(),covered=coverage(loto);if(!covered.has(equipmentId)){alert("That equipment is not shown inside the current topology-derived area for the selected Recorded LOTO.");return;}if(!acceptedCurrent(loto)){alert("The accepted displayed boundary is missing or the One-Line topology has changed. The LOTO Coordinator must review and accept the displayed boundary before adding personal protection.");return;}
  const lockId=String(fd.get("lockId")||"").trim();if(d.personalLocks.some(l=>String(l.status||"").toLowerCase()!=="removed"&&String(l.lockId||l.lockNumber||"")===lockId)){alert("That personal lock ID is already active.");return;}
  const protectionMethod=String(fd.get("protectionMethod")||"single"),groupBoxId=String(fd.get("groupBoxId")||"").trim();if(protectionMethod==="group_box"&&!groupBoxId){alert("Enter the group box ID for a group-box personal lock.");return;}if(protectionMethod==="group_box"&&!(Array.isArray(loto.groupBoxes)&&loto.groupBoxes.some(b=>b&&b.status!=="closed"&&String(b.groupBoxId)===groupBoxId))){alert("That group box is not recorded as active on the selected LOTO.");return;}const appliedAt=now(),personName=String(fd.get("personName")||"").trim(),personId=String(fd.get("personId")||"").trim()||personName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const lock={id:uid("personal-lock"),lotoId:loto.id,lotoNumber:loto.lotoNumber,status:"active",equipmentId,personId,personName,company:String(fd.get("company")||"").trim(),lockId,protectionMethod,groupBoxId,appliedAt,appliedBy:personName,ownerLayer:"loto",physicalStateRecorded:"applied"};
  d.personalLocks.push(lock);d.events.push({id:uid("event"),type:"PERSONAL_LOCK_APPLIED",timestamp:appliedAt,actor:personName,personId,personName,layer:"loto",recordId:lock.id,lotoId:loto.id,lotoNumber:loto.lotoNumber,equipmentId,lockId,payload:{company:lock.company,physicalState:"applied",protectionMethod,groupBoxId}});
  api().saveLoto(d);close();
 });
 window.addEventListener("nexus:loto-add-person-request",open);window.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
;
/* ---- one_line_loto_release.js ---- */
/**
 * NEXUS LOTO RELEASE / RESTORATION WORKFLOW
 * Stage 9: staged lifecycle. No stage establishes electrical safety.
 */
(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function api(){return window.NEXUSOneLineLayers;}
function uid(p){return p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);}
function now(){return new Date().toISOString();}
function activeLocks(d,id){return d.personalLocks.filter(x=>x&&String(x.status||"").toLowerCase()!=="removed"&&String(x.lotoId)===String(id));}
const stages=["active","work_complete","personal_protection_clear","released","restoration_authorized","restored","closed"];
const names={active:"Work Active",work_complete:"Work Complete",personal_protection_clear:"Personal Protection Clear",released:"Recorded LOTO Released",restoration_authorized:"Restoration Authorized",restored:"Restored",closed:"Closed"};
const events={work_complete:"LOTO_WORK_COMPLETE",personal_protection_clear:"LOTO_PERSONAL_PROTECTION_CLEAR",released:"LOTO_RELEASED",restoration_authorized:"LOTO_RESTORATION_AUTHORIZED",restored:"LOTO_RESTORED",closed:"LOTO_CLOSED"};
function current(l){return stages.includes(l.status)?l.status:"active";}
function next(l){return stages[stages.indexOf(current(l))+1]||null;}
function install(){
 const modal=document.createElement("div");modal.className="nx-loto-start-modal";modal.setAttribute("aria-hidden","true");document.body.appendChild(modal);
 function close(){modal.classList.remove("is-open");modal.setAttribute("aria-hidden","true");modal.innerHTML="";}
 function show(html){modal.innerHTML=html;modal.classList.add("is-open");modal.setAttribute("aria-hidden","false");}
 function removePerson(){if(!api()||!api().can("loto","participate"))return;const d=api().loadLoto(),locks=d.personalLocks.filter(x=>x&&String(x.status||"").toLowerCase()!=="removed");show('<div class="nx-loto-dialog"><header><div><span>PERSONAL PROTECTION</span><h2>Remove Person / Lock</h2></div><button type="button" data-cancel>×</button></header>'+(locks.length?'<form data-release-form><label>Active Personal Lock<select name="lockRecordId" required>'+locks.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.personName||l.personId)+' — '+esc(l.lockId||l.lockNumber)+' — '+esc(l.equipmentId)+'</option>').join("")+'</select></label><label>Removed By<input name="removedBy" required></label><label>Removal Note<textarea name="note" rows="3" required></textarea></label><label class="nx-loto-confirm"><input type="checkbox" required><span>The physical personal lock has been removed by its authorized owner. Exceptional removal requires the separate Coordinator removal workflow.</span></label><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Record Lock Removal</button></footer></form>':'<div class="nx-lock-message">There are no active personal locks to remove.</div>')+'</div>');}
 function exceptionalRemoval(){if(!api()||!api().can("loto","manage"))return;const d=api().loadLoto(),locks=d.personalLocks.filter(x=>x&&String(x.status||"").toLowerCase()!=="removed");show('<div class="nx-loto-dialog"><header><div><span>EXCEPTIONAL REMOVAL</span><h2>Personal Lock Removal Record</h2></div><button type="button" data-cancel>×</button></header>'+(locks.length?'<form data-exception-form><label>Active Personal Lock<select name="lockRecordId" required>'+locks.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.personName||l.personId)+' — '+esc(l.lockId||l.lockNumber)+' — '+esc(l.equipmentId)+'</option>').join("")+'</select></label><label>LOTO Coordinator<input name="coordinator" required></label><label>Reason for Exceptional Removal<textarea name="reason" rows="4" required></textarea></label><label class="nx-loto-confirm"><input type="checkbox" required><span>This is an exceptional removal record. The reason must be documented before the physical lock is recorded as removed.</span></label><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Record Exceptional Removal</button></footer></form>':'<div class="nx-lock-message">There are no active personal locks.</div>')+'</div>');}
 function progress(){if(!api()||!api().can("loto","manage"))return;const d=api().loadLoto(),lotos=d.lotos.filter(l=>current(l)!=="closed");show('<div class="nx-loto-dialog nx-lifecycle-dialog"><header><div><span>RECORDED LOTO</span><h2>Release / Restore</h2></div><button type="button" data-cancel>×</button></header>'+(lotos.length?'<form data-progress-form><label>Recorded LOTO<select name="lotoId" required>'+lotos.map(l=>'<option value="'+esc(l.id)+'">'+esc(l.lotoNumber||l.id)+' — '+esc(names[current(l)])+'</option>').join("")+'</select></label><div class="nx-lifecycle-state"></div><label>LOTO Coordinator<input name="actor" required placeholder="Coordinator name"></label><label>Record Note<textarea name="note" rows="3" required placeholder="Record the field condition supporting this transition"></textarea></label><label class="nx-loto-confirm"><input type="checkbox" required><span>This records an observed/authorized field step only. NEXUS is a visual and recordkeeping aid and does not guarantee a de-energized or safe electrical condition. Always verify in the field.</span></label><footer><button type="button" data-cancel>Cancel</button><button type="submit" class="primary">Record Next Stage</button></footer></form>':'<div class="nx-lock-message">There are no Recorded LOTOs awaiting completion.</div>')+'</div>');const s=modal.querySelector('[name="lotoId"]');if(s){s.addEventListener("change",renderState);renderState();}}
 function renderState(){const id=modal.querySelector('[name="lotoId"]')?.value,box=modal.querySelector(".nx-lifecycle-state");if(!id||!box)return;const d=api().loadLoto(),l=d.lotos.find(x=>x.id===id),n=next(l),locks=activeLocks(d,id);let blocked="";if(n==="personal_protection_clear"&&locks.length)blocked='<div class="nx-stage-blocked"><b>BLOCKED</b> '+locks.length+' personal lock'+(locks.length===1?" remains":"s remain")+'.</div>';box.innerHTML='<div class="nx-stage-current"><span>Current</span><b>'+esc(names[current(l)])+'</b></div><div class="nx-stage-arrow">→</div><div class="nx-stage-next"><span>Next</span><b>'+esc(names[n]||"Complete")+'</b></div>'+blocked;}
 modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest("[data-cancel]"))close();});
 modal.addEventListener("submit",e=>{e.preventDefault();const form=e.target,fd=new FormData(form),d=api().loadLoto();
  if(form.hasAttribute("data-exception-form")){const lock=d.personalLocks.find(l=>l.id===fd.get("lockRecordId")&&String(l.status||"").toLowerCase()!=="removed");if(!lock)return;const t=now(),actor=String(fd.get("coordinator")||"").trim(),reason=String(fd.get("reason")||"").trim(),loto=d.lotos.find(x=>x.id===lock.lotoId);if(!actor||!reason)return;if(loto&&loto.lotoCoordinator&&actor!==String(loto.lotoCoordinator).trim())return alert("This Recorded LOTO is currently assigned to "+loto.lotoCoordinator+". Use Coordinator Handoff before another Coordinator records exceptional removal.");lock.status="removed";lock.removedAt=t;lock.removedBy=actor;lock.physicalStateRecorded="exceptional_removal_recorded";lock.removalType="exceptional";lock.exceptionalRemovalReason=reason;d.events.push({id:uid("event"),type:"PERSONAL_LOCK_EXCEPTION_REMOVED",timestamp:t,actor,personId:lock.personId,personName:lock.personName,layer:"loto",recordId:lock.id,lotoId:lock.lotoId,lotoNumber:lock.lotoNumber,equipmentId:lock.equipmentId,lockId:lock.lockId,payload:{physicalState:"exceptional_removal_recorded",reason}});api().saveLoto(d);close();return;}
  if(form.hasAttribute("data-release-form")){const lock=d.personalLocks.find(l=>l.id===fd.get("lockRecordId")&&String(l.status||"").toLowerCase()!=="removed");if(!lock)return;const t=now(),actor=String(fd.get("removedBy")||"").trim(),note=String(fd.get("note")||"").trim();if(!note)return;lock.status="removed";lock.removedAt=t;lock.removedBy=actor;lock.physicalStateRecorded="removed";d.events.push({id:uid("event"),type:"PERSONAL_LOCK_REMOVED",timestamp:t,actor,personId:lock.personId,personName:lock.personName,layer:"loto",recordId:lock.id,lotoId:lock.lotoId,lotoNumber:lock.lotoNumber,equipmentId:lock.equipmentId,lockId:lock.lockId,payload:{physicalState:"removed",note}});api().saveLoto(d);close();return;}
  const l=d.lotos.find(x=>x.id===fd.get("lotoId"));if(!l)return;const n=next(l);if(!n)return;if(n==="personal_protection_clear"&&activeLocks(d,l.id).length){renderState();return;}if(n==="personal_protection_clear"&&Array.isArray(l.groupBoxes)){const uncleared=l.groupBoxes.filter(b=>b&&b.status!=="cleared");if(uncleared.length){alert("Record each group box as clear before Personal Protection Clear. Active group boxes: "+uncleared.map(b=>b.groupBoxId).join(", "));return;}}const t=now(),actor=String(fd.get("actor")||"").trim(),note=String(fd.get("note")||"").trim();if(l.lotoCoordinator&&actor!==String(l.lotoCoordinator).trim()){alert("This Recorded LOTO is currently assigned to "+l.lotoCoordinator+". Use Coordinator Handoff before another Coordinator records lifecycle actions.");return;}l.status=n;l.updatedAt=t;l.updatedBy=actor;l.lifecycle=l.lifecycle||[];l.lifecycle.push({stage:n,timestamp:t,actor,note});if(n==="closed"){l.closedAt=t;l.closedBy=actor;}d.events.push({id:uid("event"),type:events[n],timestamp:t,actor,layer:"loto",recordId:l.id,lotoId:l.id,lotoNumber:l.lotoNumber,equipmentId:l.equipmentId,payload:{status:n,note}});api().saveLoto(d);close();
 });
 window.addEventListener("nexus:loto-remove-person-request",removePerson);window.addEventListener("nexus:loto-exception-remove-request",exceptionalRemoval);window.addEventListener("nexus:loto-progress-request",progress);window.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
;
/* ---- one_line_loto_history.js ---- */
/**
 * NEXUS LOTO HISTORY
 * Stage 8: reconstructs LOTO/person/equipment history from the immutable event ledger.
 */
(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function api(){return window.NEXUSOneLineLayers;}
function when(v){if(!v)return"Unknown time";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString();}
function label(type){return({LOTO_CREATED:"LOTO Created",PERSONAL_LOCK_APPLIED:"Personal Lock Applied",PERSONAL_LOCK_REMOVED:"Personal Lock Removed",PERSONAL_LOCK_EXCEPTION_REMOVED:"Exceptional Personal Lock Removal",LOTO_COORDINATOR_HANDOFF:"LOTO Coordinator Handoff",LOTO_GROUP_BOX_RECORDED:"Group Box Recorded",LOTO_GROUP_BOX_CLEARED:"Group Box Clear Recorded",LOTO_GROUP_BOX_CUSTODY_RECORDED:"Group Box Key Custody Recorded",ISOLATION_POINT_IDENTIFIED:"Isolation Point Identified",ISOLATION_POINT_LOCKED:"Isolation Control Lock Applied",ISOLATION_PATH_RECORDED:"Isolation Path Recorded",ISOLATION_PATH_CONFIRMED_BY_DESIGNATED_ENERGY_MARSHAL:"Designated Energy Marshal Confirmed Path",ISOLATION_POINT_QEW_VERIFIED_DEENERGIZED:"QEW Verified De-energized",LOTO_DISPLAYED_BOUNDARY_ACCEPTED:"Displayed Boundary Accepted",LOTO_BOUNDARY_INVALIDATED_BY_TOPOLOGY_CHANGE:"Boundary Invalidated - One-Line Changed",LOTO_TOPOLOGY_INCOMING_PATH_OVERRIDE:"Incoming Path Exception Recorded",LOTO_ISSUE_FLAGGED:"Possible Issue Flagged",LOTO_ISSUE_CLOSED:"LOTO Issue Closed",LOTO_WORK_COMPLETE:"Work Complete",LOTO_PERSONAL_PROTECTION_CLEAR:"Personal Protection Clear",LOTO_RELEASED:"Recorded LOTO Released",LOTO_RESTORATION_AUTHORIZED:"Restoration Authorized",LOTO_RESTORED:"Restored",LOTO_CLOSED:"LOTO Closed"}[type]||String(type||"Event").replace(/_/g," "));}
function install(){
 const sheet=document.createElement("section");sheet.className="nx-loto-history-sheet";sheet.setAttribute("aria-label","LOTO history");document.body.appendChild(sheet);
 let query="",type="all";
 function close(){sheet.classList.remove("is-open");sheet.innerHTML="";}
 function open(){if(!api()||!api().can("loto","view_history"))return;sheet.classList.add("is-open");render();}
 function matches(e){if(type!=="all"&&e.type!==type)return false;const q=query.trim().toLowerCase();if(!q)return true;return [e.type,e.actor,e.personId,e.personName,e.lotoId,e.lotoNumber,e.equipmentId,e.lockId,e.isolationPoint,e.recordId,e.payload&&e.payload.company].some(v=>String(v||"").toLowerCase().includes(q));}
 function render(){
  if(!sheet.classList.contains("is-open"))return;const d=api().loadLoto(),events=d.events.slice().sort((a,b)=>String(b.timestamp||"").localeCompare(String(a.timestamp||""))).filter(matches);
  const people=new Set(d.events.map(e=>e.personId||e.personName).filter(Boolean)),lotos=new Set(d.events.map(e=>e.lotoId||((e.type==="LOTO_CREATED")?e.recordId:null)).filter(Boolean)),equipment=new Set(d.events.map(e=>e.equipmentId).filter(Boolean));
  sheet.innerHTML='<header><div><span>EVENT LEDGER</span><h2>LOTO History</h2></div><button type="button" data-close>×</button></header>'+
   '<div class="nx-history-summary"><div><b>'+d.events.length+'</b><span>Events</span></div><div><b>'+lotos.size+'</b><span>LOTO Records</span></div><div><b>'+people.size+'</b><span>People</span></div><div><b>'+equipment.size+'</b><span>Equipment</span></div></div>'+
   '<div class="nx-history-tools"><input type="search" value="'+esc(query)+'" placeholder="Person, LOTO, equipment, lock, actor..."><select><option value="all">All events</option>'+["LOTO_CREATED","ISOLATION_POINT_IDENTIFIED","ISOLATION_POINT_LOCKED","ISOLATION_PATH_RECORDED","ISOLATION_PATH_CONFIRMED_BY_DESIGNATED_ENERGY_MARSHAL","ISOLATION_POINT_QEW_VERIFIED_DEENERGIZED","LOTO_DISPLAYED_BOUNDARY_ACCEPTED","LOTO_BOUNDARY_INVALIDATED_BY_TOPOLOGY_CHANGE","LOTO_TOPOLOGY_INCOMING_PATH_OVERRIDE","LOTO_ISSUE_FLAGGED","LOTO_ISSUE_CLOSED","PERSONAL_LOCK_APPLIED","PERSONAL_LOCK_REMOVED","PERSONAL_LOCK_EXCEPTION_REMOVED","LOTO_COORDINATOR_HANDOFF","LOTO_GROUP_BOX_RECORDED","LOTO_GROUP_BOX_CLEARED","LOTO_GROUP_BOX_CUSTODY_RECORDED","LOTO_WORK_COMPLETE","LOTO_PERSONAL_PROTECTION_CLEAR","LOTO_RELEASED","LOTO_RESTORATION_AUTHORIZED","LOTO_RESTORED","LOTO_CLOSED"].map(t=>'<option '+(type===t?'selected ':'')+'value="'+t+'">'+label(t)+'</option>').join("")+'</select></div>'+
   '<div class="nx-history-events">'+(events.length?events.map(eventHtml).join(""):'<div class="nx-history-empty">No history matches these filters.</div>')+'</div>';
  const input=sheet.querySelector("input");input.addEventListener("input",e=>{query=e.target.value;render();const n=sheet.querySelector("input");if(n){n.focus();n.setSelectionRange(query.length,query.length);}});sheet.querySelector("select").addEventListener("change",e=>{type=e.target.value;render();});
 }
 function eventHtml(e){const bits=[e.lotoNumber&&("LOTO "+e.lotoNumber),e.personName,e.equipmentId,e.lockId&&("Lock "+e.lockId),e.isolationPoint&&("Isolation "+e.isolationPoint)].filter(Boolean);return '<article class="nx-history-event '+esc(String(e.type||"").toLowerCase())+'"><div class="nx-history-dot"></div><div class="nx-history-main"><div class="nx-history-head"><strong>'+esc(label(e.type))+'</strong><time>'+esc(when(e.timestamp))+'</time></div><div class="nx-history-relations">'+bits.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div><div class="nx-history-actor">Recorded by <b>'+esc(e.actor||"Unknown")+'</b></div></div></article>';}
 sheet.addEventListener("click",e=>{if(e.target===sheet||e.target.closest("[data-close]"))close();});
 window.addEventListener("nexus:loto-history-request",open);window.addEventListener("nexus:loto-change",()=>{if(sheet.classList.contains("is-open"))render();});window.addEventListener("nexus:layerchange",e=>{if(!e.detail||e.detail.layer!=="loto")close();});window.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
