/**
 * NEXUS LOTO TOPOLOGY HIGHLIGHT
 * Visual aid only. Highlights recorded isolation points and topology-derived downstream equipment.
 */
(function(){"use strict";
function clear(){document.querySelectorAll(".nexus-one-line .node.nx-loto-downstream,.nexus-one-line .node.nx-loto-isolation").forEach(n=>n.classList.remove("nx-loto-downstream","nx-loto-isolation"));}
function findNode(id){return Array.from(document.querySelectorAll(".nexus-one-line .node")).find(n=>{const t=n.querySelector(".id");return t&&String(t.textContent||"").trim()===String(id);});}
function apply(detail){clear();if(document.body.dataset.nexusLayer!=="loto"||!detail)return;(detail.analysis&&detail.analysis.downstreamEquipmentIds||[]).forEach(id=>{const n=findNode(id);if(n)n.classList.add("nx-loto-downstream");});(detail.isolationEquipmentIds||[]).forEach(id=>{const n=findNode(id);if(n)n.classList.add("nx-loto-isolation");});}
window.addEventListener("nexus:loto-topology-view",e=>apply(e.detail));
window.addEventListener("nexus:layerchange",e=>{if(!e.detail||e.detail.layer!=="loto")clear();});
window.addEventListener("nexus:loto-change",()=>clear());
window.addEventListener("nexus:loto-fit-request",()=>{if(document.body.dataset.nexusLayer!=="loto")return;const ns=Array.from(document.querySelectorAll(".nexus-one-line .node.nx-loto-downstream,.nexus-one-line .node.nx-loto-isolation,.nexus-one-line .node.nx-loto-has-issue"));if(!ns.length){if(window.nexusOneLineWorkspace&&typeof window.nexusOneLineWorkspace.fit==="function")window.nexusOneLineWorkspace.fit();return;}const r=ns.map(n=>n.getBoundingClientRect()),left=Math.min(...r.map(x=>x.left)),right=Math.max(...r.map(x=>x.right)),top=Math.min(...r.map(x=>x.top)),bottom=Math.max(...r.map(x=>x.bottom)),target=ns.find(n=>{const b=n.getBoundingClientRect();return b.left<=left+1&&b.top<=top+1;})||ns[0];target.scrollIntoView({behavior:"smooth",block:"center",inline:"center"});window.dispatchEvent(new CustomEvent("nexus:loto-fit-area",{detail:{left,right,top,bottom,equipmentCount:ns.length}}));});
})();