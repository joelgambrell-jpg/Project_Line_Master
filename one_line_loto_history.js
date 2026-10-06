/**
 * NEXUS LOTO HISTORY
 * Stage 8: reconstructs LOTO/person/equipment history from the immutable event ledger.
 */
(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function api(){return window.NEXUSOneLineLayers;}
function when(v){if(!v)return"Unknown time";const d=new Date(v);return isNaN(d)?String(v):d.toLocaleString();}
function label(type){return({LOTO_CREATED:"LOTO Created",PERSONAL_LOCK_APPLIED:"Personal Lock Applied",PERSONAL_LOCK_REMOVED:"Personal Lock Removed",PERSONAL_LOCK_EXCEPTION_REMOVED:"Exceptional Personal Lock Removal",LOTO_COORDINATOR_HANDOFF:"LOTO Coordinator Handoff",LOTO_GROUP_BOX_RECORDED:"Group Box Recorded",ISOLATION_POINT_IDENTIFIED:"Isolation Point Identified",ISOLATION_POINT_LOCKED:"Isolation Control Lock Applied",ISOLATION_PATH_RECORDED:"Isolation Path Recorded",ISOLATION_PATH_CONFIRMED_BY_DESIGNATED_ENERGY_MARSHAL:"Designated Energy Marshal Confirmed Path",ISOLATION_POINT_QEW_VERIFIED_DEENERGIZED:"QEW Verified De-energized",LOTO_DISPLAYED_BOUNDARY_ACCEPTED:"Displayed Boundary Accepted",LOTO_BOUNDARY_INVALIDATED_BY_TOPOLOGY_CHANGE:"Boundary Invalidated - One-Line Changed",LOTO_TOPOLOGY_INCOMING_PATH_OVERRIDE:"Incoming Path Exception Recorded",LOTO_ISSUE_FLAGGED:"Possible Issue Flagged",LOTO_WORK_COMPLETE:"Work Complete",LOTO_PERSONAL_PROTECTION_CLEAR:"Personal Protection Clear",LOTO_RELEASED:"Recorded LOTO Released",LOTO_RESTORATION_AUTHORIZED:"Restoration Authorized",LOTO_RESTORED:"Restored",LOTO_CLOSED:"LOTO Closed"}[type]||String(type||"Event").replace(/_/g," "));}
function install(){
 const sheet=document.createElement("section");sheet.className="nx-loto-history-sheet";sheet.setAttribute("aria-label","LOTO history");document.body.appendChild(sheet);
 let query="",type="all";
 function close(){sheet.classList.remove("is-open");sheet.innerHTML="";}
 function open(){if(!api()||!api().can("loto","history"))return;sheet.classList.add("is-open");render();}
 function matches(e){if(type!=="all"&&e.type!==type)return false;const q=query.trim().toLowerCase();if(!q)return true;return [e.type,e.actor,e.personId,e.personName,e.lotoId,e.lotoNumber,e.equipmentId,e.lockId,e.isolationPoint,e.recordId,e.payload&&e.payload.company].some(v=>String(v||"").toLowerCase().includes(q));}
 function render(){
  if(!sheet.classList.contains("is-open"))return;const d=api().loadLoto(),events=d.events.slice().sort((a,b)=>String(b.timestamp||"").localeCompare(String(a.timestamp||""))).filter(matches);
  const people=new Set(d.events.map(e=>e.personId||e.personName).filter(Boolean)),lotos=new Set(d.events.map(e=>e.lotoId||((e.type==="LOTO_CREATED")?e.recordId:null)).filter(Boolean)),equipment=new Set(d.events.map(e=>e.equipmentId).filter(Boolean));
  sheet.innerHTML='<header><div><span>EVENT LEDGER</span><h2>LOTO History</h2></div><button type="button" data-close>×</button></header>'+
   '<div class="nx-history-summary"><div><b>'+d.events.length+'</b><span>Events</span></div><div><b>'+lotos.size+'</b><span>LOTO Records</span></div><div><b>'+people.size+'</b><span>People</span></div><div><b>'+equipment.size+'</b><span>Equipment</span></div></div>'+
   '<div class="nx-history-tools"><input type="search" value="'+esc(query)+'" placeholder="Person, LOTO, equipment, lock, actor..."><select><option value="all">All events</option>'+["LOTO_CREATED","ISOLATION_POINT_IDENTIFIED","ISOLATION_POINT_LOCKED","ISOLATION_PATH_RECORDED","ISOLATION_PATH_CONFIRMED_BY_DESIGNATED_ENERGY_MARSHAL","ISOLATION_POINT_QEW_VERIFIED_DEENERGIZED","LOTO_DISPLAYED_BOUNDARY_ACCEPTED","LOTO_BOUNDARY_INVALIDATED_BY_TOPOLOGY_CHANGE","LOTO_TOPOLOGY_INCOMING_PATH_OVERRIDE","LOTO_ISSUE_FLAGGED","PERSONAL_LOCK_APPLIED","PERSONAL_LOCK_REMOVED","PERSONAL_LOCK_EXCEPTION_REMOVED","LOTO_COORDINATOR_HANDOFF","LOTO_GROUP_BOX_RECORDED","LOTO_WORK_COMPLETE","LOTO_PERSONAL_PROTECTION_CLEAR","LOTO_RELEASED","LOTO_RESTORATION_AUTHORIZED","LOTO_RESTORED","LOTO_CLOSED"].map(t=>'<option '+(type===t?'selected ':'')+'value="'+t+'">'+label(t)+'</option>').join("")+'</select></div>'+
   '<div class="nx-history-events">'+(events.length?events.map(eventHtml).join(""):'<div class="nx-history-empty">No history matches these filters.</div>')+'</div>';
  const input=sheet.querySelector("input");input.addEventListener("input",e=>{query=e.target.value;render();const n=sheet.querySelector("input");if(n){n.focus();n.setSelectionRange(query.length,query.length);}});sheet.querySelector("select").addEventListener("change",e=>{type=e.target.value;render();});
 }
 function eventHtml(e){const bits=[e.lotoNumber&&("LOTO "+e.lotoNumber),e.personName,e.equipmentId,e.lockId&&("Lock "+e.lockId),e.isolationPoint&&("Isolation "+e.isolationPoint)].filter(Boolean);return '<article class="nx-history-event '+esc(String(e.type||"").toLowerCase())+'"><div class="nx-history-dot"></div><div class="nx-history-main"><div class="nx-history-head"><strong>'+esc(label(e.type))+'</strong><time>'+esc(when(e.timestamp))+'</time></div><div class="nx-history-relations">'+bits.map(x=>'<span>'+esc(x)+'</span>').join("")+'</div><div class="nx-history-actor">Recorded by <b>'+esc(e.actor||"Unknown")+'</b></div></div></article>';}
 sheet.addEventListener("click",e=>{if(e.target===sheet||e.target.closest("[data-close]"))close();});
 window.addEventListener("nexus:loto-history-request",open);window.addEventListener("nexus:loto-change",()=>{if(sheet.classList.contains("is-open"))render();});window.addEventListener("nexus:layerchange",e=>{if(!e.detail||e.detail.layer!=="loto")close();});window.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("is-open"))close();});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();