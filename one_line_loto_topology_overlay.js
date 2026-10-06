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
})();