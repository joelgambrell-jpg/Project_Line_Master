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
window.addEventListener("nexus:loto-fit-request",()=>{if(document.body.dataset.nexusLayer!=="loto")return;const a=window.NEXUSOneLineLayers;if(!a)return;const d=a.loadLoto(),active=d.lotos.filter(l=>l&&l.status!=="closed"),ids=new Set();active.forEach(l=>{(l.isolationPoints||[]).forEach(p=>{if(p&&p.equipmentId)ids.add(String(p.equipmentId));});const b=l.boundaryAcceptance;if(b&&b.accepted)(b.downstreamEquipmentIds||[]).forEach(id=>ids.add(String(id)));});d.events.filter(x=>x&&x.type==="LOTO_ISSUE_FLAGGED"&&x.payload&&x.payload.status==="open"&&!d.events.some(y=>y&&y.type==="LOTO_ISSUE_CLOSED"&&y.payload&&y.payload.issueEventId===x.id)).forEach(x=>{if(x.equipmentId)ids.add(String(x.equipmentId));});const w=window.nexusOneLineWorkspace;if(w&&typeof w.fitEquipment==="function")w.fitEquipment(Array.from(ids));else if(w&&typeof w.fit==="function")w.fit();});
})();