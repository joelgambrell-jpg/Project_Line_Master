/**
 * NEXUS LOTO PEOPLE VIEW
 * Stage 4: reverse lookup from person -> active equipment and personal locks.
 */
(function(){
"use strict";
const mounted=new WeakSet();
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function data(){return window.NEXUSOneLineLayers&&window.NEXUSOneLineLayers.loadLoto?window.NEXUSOneLineLayers.loadLoto():{aceLotos:[],personalLocks:[]};}
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