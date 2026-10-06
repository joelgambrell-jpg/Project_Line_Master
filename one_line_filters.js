/**
 * NEXUS ONE-LINE SHARED FILTER MODEL
 * Building is supplied by project context. Phase and Area use equipment metadata.
 * Operational layers consume the same filter state.
 */
(function(){"use strict";
let state={phase:"all",area:"all"};
function text(v){return String(v==null?"":v).trim();}
function equipment(){const w=window.nexusOneLineWorkspace;return w&&typeof w.getEquipment==="function"?w.getEquipment():Array.isArray(window.NEXUS_DASHBOARD_EQUIPMENT)?window.NEXUS_DASHBOARD_EQUIPMENT:[];}
function val(e,k){return text(e&&((e[k]!==undefined?e[k]:e[k.charAt(0).toUpperCase()+k.slice(1)])));}
function options(key){return Array.from(new Set(equipment().map(e=>val(e,key)).filter(Boolean))).sort();}
function apply(){document.querySelectorAll(".nexus-one-line .node").forEach(n=>{const id=text(n.querySelector(".id")?.textContent),e=equipment().find(x=>text(x.equipmentId||x.id)===id),show=(!e||state.phase==="all"||val(e,"phase")===state.phase)&&(!e||state.area==="all"||val(e,"area")===state.area);n.classList.toggle("nx-filter-hidden",!show);});window.dispatchEvent(new CustomEvent("nexus:filters-change",{detail:{...state}}));}
function install(){const bar=document.querySelector(".nx-layer-bar");if(!bar||document.querySelector(".nx-shared-filters"))return;const host=document.createElement("div");host.className="nx-shared-filters";function render(){host.innerHTML='<label>Phase <select data-filter="phase"><option value="all">All</option>'+options("phase").map(x=>'<option>'+x+'</option>').join("")+'</select></label><label>Area <select data-filter="area"><option value="all">All</option>'+options("area").map(x=>'<option>'+x+'</option>').join("")+'</select></label>';host.querySelector('[data-filter="phase"]').value=state.phase;host.querySelector('[data-filter="area"]').value=state.area;}host.addEventListener("change",e=>{const k=e.target.dataset.filter;if(!k)return;state[k]=e.target.value;apply();});bar.appendChild(host);render();apply();window.addEventListener("nexus:layerchange",apply);window.NEXUSOneLineFilters={get:()=>({...state}),set:x=>{state={...state,...x};render();apply();}};}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(install,0));else setTimeout(install,0);
})();