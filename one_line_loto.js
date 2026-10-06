/**
 * NEXUS ONE-LINE LOTO EQUIPMENT OVERLAY
 * Stage 3: read-only equipment/person/lock detail over the existing SME topology.
 * This module never creates or changes electrical relationships.
 */
(function(){
"use strict";
const mounted=new WeakSet();
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function active(v,closed){return v&&String(v.status||"").toLowerCase()!==closed;}
function records(){return window.NEXUSOneLineLayers&&window.NEXUSOneLineLayers.loadLoto?window.NEXUSOneLineLayers.loadLoto():{lotos:[],personalLocks:[]};}
function selectedId(root){const n=root.querySelector(".node.selected");if(!n)return"";return String(n.dataset.equipmentId||(n.querySelector(".id")&&n.querySelector(".id").textContent)||"").trim();}
function lotoForEquipment(data,id){
 return data.lotos.filter(a=>active(a,"closed")&&(
   String(a.equipmentId||"")===id ||
   (Array.isArray(a.equipmentIds)&&a.equipmentIds.map(String).includes(id)) ||
   (a.boundaryAcceptance&&a.boundaryAcceptance.accepted&&Array.isArray(a.boundaryAcceptance.downstreamEquipmentIds)&&a.boundaryAcceptance.downstreamEquipmentIds.map(String).includes(id))
 ));
}
function locksForEquipment(data,id){return data.personalLocks.filter(l=>active(l,"removed")&&String(l.equipmentId||"")===id);}
function install(root){
 if(!root||mounted.has(root))return;mounted.add(root);
 const panel=document.createElement("aside");panel.className="nx-loto-equipment-panel";panel.setAttribute("aria-live","polite");panel.innerHTML='<div class="nx-loto-empty"><strong>Select equipment</strong><span>Tap equipment on the One-Line to inspect its LOTO relationship.</span></div>';
 document.body.appendChild(panel);
 function render(){
   const isLoto=document.body.dataset.nexusLayer==="loto";panel.classList.toggle("is-open",isLoto);if(!isLoto)return;
   const id=selectedId(root);if(!id){panel.innerHTML='<div class="nx-loto-empty"><strong>Select equipment</strong><span>Tap equipment on the One-Line to inspect its LOTO relationship.</span></div>';return;}
   const data=records(),lotos=lotoForEquipment(data,id),locks=locksForEquipment(data,id),people=new Map();
   locks.forEach(l=>{const key=l.personId||l.personName||l.lockId;if(!people.has(key))people.set(key,{name:l.personName||l.personId||"Unknown person",company:l.company||"",locks:[]});people.get(key).locks.push(l);});
   const controlling=lotos[0]||null;
   let html='<header><div><span class="nx-loto-kicker">LOTO EQUIPMENT</span><h2>'+esc(id)+'</h2></div><span class="nx-loto-state '+(controlling||locks.length?"active":"clear")+'">'+(controlling||locks.length?"LOTO ACTIVE":"NO ACTIVE LOTO")+'</span></header>';
   html+='<section class="nx-loto-card"><h3>LOTO CONTROL</h3>';
   if(controlling){html+='<dl><dt>LOTO</dt><dd>'+esc(controlling.lotoNumber||controlling.id||"Active")+'</dd><dt>LOTO Coordinator</dt><dd>'+esc(controlling.lotoCoordinator||controlling.energyMarshal||controlling.controllingEnergyMarshal||"Not recorded")+'</dd><dt>Stage</dt><dd>'+esc(String(controlling.status||"active").replace(/_/g," ").toUpperCase())+'</dd><dt>Isolation Points</dt><dd>'+esc((controlling.isolationPoints||[]).map(p=>p.equipmentId).filter(Boolean).join(", ")||controlling.isolationPoint||"Not recorded")+'</dd><dt>Boundary</dt><dd>'+(controlling.boundaryAcceptance&&controlling.boundaryAcceptance.accepted?"ACCEPTED":"REVIEW REQUIRED")+'</dd></dl>';}else{html+='<p>No active controlling LOTO currently references this equipment.</p>';}html+='</section>';
   html+='<section class="nx-loto-card"><div class="nx-loto-card-head"><h3>PEOPLE & PERSONAL LOCKS</h3><b>'+people.size+'</b></div>';
   if(!people.size){html+='<p>No active personal locks are recorded on this equipment.</p>';}else{people.forEach(p=>{html+='<div class="nx-loto-person"><div><strong>'+esc(p.name)+'</strong><span>'+esc(p.company||"Company not recorded")+'</span></div><div class="nx-loto-locks">'+p.locks.map(l=>'<span>'+esc(l.lockId||l.lockNumber||"LOCK")+'</span>').join("")+'</div></div>';});}html+='</section>';
   html+='<section class="nx-loto-card nx-loto-source"><h3>ELECTRICAL SOURCE OF TRUTH</h3><p>Equipment identity and electrical relationships come from the SME-built One-Line. This LOTO layer only attaches operational records to that topology.</p></section>';
   panel.innerHTML=html;
 }
 const obs=new MutationObserver(()=>requestAnimationFrame(render));obs.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:["class","data-equipment-id"]});
 window.addEventListener("nexus:layerchange",render);window.addEventListener("nexus:loto-change",render);window.addEventListener("storage",render);render();
}
function scan(){document.querySelectorAll(".nexus-one-line").forEach(install);}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",scan);else scan();
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();