/**
 * NEXUS BREAKER INTERACTION
 * Breakers remain children of their NEXUS parent equipment but are individually addressable.
 */
(function(){"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function eid(e){return String(e&& (e.equipmentId||e.id)||"");}
function bid(b,i){return String(b&& (b.breakerId||b.id||b.designation||b.name)||("CB-"+(i+1)));}
function install(){const panel=document.createElement("section");panel.className="nx-breaker-panel";panel.hidden=true;document.body.appendChild(panel);
function close(){panel.hidden=true;panel.innerHTML="";}
function open(parent,breaker,index){const id=bid(breaker,index),from=breaker.from||breaker.source||parent.source||"Not recorded",to=breaker.to||breaker.destination||"Not recorded";const d=window.NEXUSOneLineLayers?window.NEXUSOneLineLayers.loadLoto():{lotos:[]};const ref=eid(parent)+"::"+id,lotos=d.lotos.filter(l=>l&&l.status!=="closed"&&((l.isolationPoints||[]).some(p=>String(p.breakerRef||"")===ref)||(l.breakerRefs||[]).map(String).includes(ref)));panel.innerHTML='<header><div><span>BREAKER</span><h2>'+esc(id)+'</h2><small>'+esc(eid(parent))+'</small></div><button data-close>×</button></header><dl><dt>FROM</dt><dd>'+esc(from)+'</dd><dt>TO</dt><dd>'+esc(to)+'</dd><dt>LOTO</dt><dd>'+(lotos.length?lotos.map(l=>esc(l.lotoNumber||l.id)).join(", "):"None recorded")+'</dd></dl><button data-parent="'+esc(eid(parent))+'">Open NEXUS Equipment</button>';panel.hidden=false;}
panel.addEventListener("click",e=>{if(e.target.closest("[data-close]"))return close();const b=e.target.closest("[data-parent]");if(b&&window.nexusOneLineWorkspace?.openEquipment)window.nexusOneLineWorkspace.openEquipment(b.dataset.parent);});
function decorate(){const w=window.nexusOneLineWorkspace;if(!w||typeof w.getEquipment!=="function")return;w.getEquipment().forEach(parent=>{const breakers=Array.isArray(parent.breakers)?parent.breakers:[];if(!breakers.length)return;const n=Array.from(document.querySelectorAll(".nexus-one-line .node")).find(x=>String(x.querySelector(".id")?.textContent||"").trim()===eid(parent));if(!n||n.querySelector(".nx-breakers"))return;const h=document.createElement("div");h.className="nx-breakers";breakers.forEach((b,i)=>{const x=document.createElement("button");x.type="button";x.className="nx-breaker";x.textContent=bid(b,i);x.title="Open breaker information";x.addEventListener("click",e=>{e.stopPropagation();open(parent,b,i);});h.appendChild(x);});n.appendChild(h);});}
window.addEventListener("nexus:layerchange",decorate);window.addEventListener("nexus:loto-change",decorate);setTimeout(decorate,100);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();