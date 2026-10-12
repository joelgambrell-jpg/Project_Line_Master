/* NEXUS LOTO padlocks rendered as native SVG inside One-Line nodes.
   Operational indication only; never a declaration of electrical safety. */
(function(){"use strict";
const NS="http://www.w3.org/2000/svg";
const api=()=>window.NEXUSOneLineLayers;
const idOf=n=>String(n.querySelector(".id")?.textContent||"").trim();
function el(tag,attrs){const n=document.createElementNS(NS,tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));return n;}
function clear(){document.querySelectorAll(".nx-loto-svg-lock").forEach(n=>n.remove());}
function badge(node,items){
 const box=node.getBBox();if(!box.width||!box.height)return;
 const x=box.x+box.width-13,y=box.y-16;
 const g=el("g",{class:"nx-loto-svg-lock",transform:"translate("+x+" "+y+")",role:"button",tabindex:"0","aria-label":"LOTO status for "+idOf(node)});
 g.style.cursor="pointer";
 const verified=items.some(x=>x.verified),pending=items.some(x=>!x.verified);
 g.appendChild(el("rect",{x:-3,y:-3,width:items.length>1?43:30,height:39,rx:7,fill:"#16191e",stroke:"#f3c52b","stroke-width":2}));
 const shackle=el("path",{d:"M5 15 V10 A7 7 0 0 1 19 10 V15",fill:"none",stroke:"#f3c52b","stroke-width":3.5,"stroke-linecap":"round"});
 g.appendChild(shackle);
 g.appendChild(el("rect",{x:3,y:14,width:18,height:16,rx:3,fill:verified&&!pending?"#f3c52b":"#16191e",stroke:"#f3c52b","stroke-width":2}));
 g.appendChild(el("circle",{cx:12,cy:21,r:2,fill:verified&&!pending?"#16191e":"#f3c52b"}));
 if(items.length>1){const t=el("text",{x:31,y:25,fill:"#fff","font-size":14,"font-weight":900,"text-anchor":"middle"});t.textContent=items.length;g.appendChild(t);}
 const title=el("title");title.textContent=items.length+" LOTO record(s) — "+(pending?"verification pending":"accepted boundary recorded")+". Not proof of deenergization.";g.appendChild(title);
 const open=e=>{e.preventDefault();e.stopPropagation();node.dispatchEvent(new MouseEvent("click",{bubbles:true}));window.dispatchEvent(new CustomEvent("nexus:loto-object-open",{detail:{type:"loto-padlock",equipmentId:idOf(node),lotoIds:items.map(x=>x.id)}}));};
 g.addEventListener("click",open);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" " )open(e);});
 node.appendChild(g);
}
function render(){
 clear();if(!api())return;
 const data=api().loadLoto(),map=new Map();
 (data.lotos||[]).filter(l=>l&&l.status!=="closed").forEach(l=>{
   const accepted=!!l.boundaryAcceptance?.accepted;
   const ids=new Set([l.equipmentId,...(l.equipmentIds||[]),...(l.isolationPoints||[]).map(p=>p.equipmentId),...(accepted?(l.boundaryAcceptance.downstreamEquipmentIds||[]):[])].filter(Boolean).map(String));
   ids.forEach(id=>{if(!map.has(id))map.set(id,[]);map.get(id).push({id:l.id,verified:accepted});});
 });
 document.querySelectorAll(".nexus-one-line .node").forEach(n=>{const records=map.get(idOf(n));if(records?.length){try{badge(n,records);}catch(e){console.warn("[NEXUS LOTO] Could not draw padlock",e);}}});
}
function legend(){let bar=document.querySelector(".nx-loto-map-legend");if(!api()){bar?.remove();return;}if(!bar){bar=document.createElement("div");bar.className="nx-loto-map-legend";bar.setAttribute("role","status");bar.style.cssText="display:flex;flex-wrap:wrap;gap:14px;align-items:center;padding:9px 14px;background:#181e26;color:#f3f5f7;border:1px solid #48535f;border-radius:8px;margin:8px 0;font:600 13px system-ui;";const host=document.getElementById("oneLineWorkspaceHost");if(host?.parentNode)host.parentNode.insertBefore(bar,host);}bar.innerHTML='<strong>VISUAL STATUS</strong><span style="color:#f3c52b">♧ OUTLINED PADLOCK — pending</span><span style="color:#f3c52b">■ SOLID PADLOCK — boundary accepted</span><span>Number — overlapping LOTOs</span><small style="opacity:.75">Recorded status only · Verify physical condition</small>';}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render();legend();});}
window.addEventListener("nexus:loto-change",schedule);window.addEventListener("nexus:layerchange",schedule);window.addEventListener("nexus:loto-topology-view",schedule);
const observer=new MutationObserver(changes=>{if(changes.some(x=>Array.from(x.addedNodes).some(n=>n.nodeType===1&&!n.classList?.contains("nx-loto-svg-lock"))))schedule();});
function init(){observer.observe(document.body,{childList:true,subtree:true});schedule();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();