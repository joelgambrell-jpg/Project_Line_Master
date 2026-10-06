/**
 * NEXUS LOTO ISSUE MARKERS
 * Open issue callouts are displayed at their recorded One-Line equipment location.
 */
(function(){"use strict";
function api(){return window.NEXUSOneLineLayers;}
function nodes(){return Array.from(document.querySelectorAll(".nexus-one-line .node"));}
function nodeFor(id){return nodes().find(n=>{const x=n.querySelector(".id");return x&&String(x.textContent||"").trim()===String(id||"");});}
function clear(){document.querySelectorAll(".nx-loto-issue-marker").forEach(x=>x.remove());document.querySelectorAll(".node.nx-loto-has-issue").forEach(x=>x.classList.remove("nx-loto-has-issue"));}
function openIssues(){const d=api().loadLoto();return d.events.filter(e=>e&&e.type==="LOTO_ISSUE_FLAGGED"&&e.payload&&e.payload.status==="open"&&!d.events.some(x=>x&&x.type==="LOTO_ISSUE_CLOSED"&&x.payload&&x.payload.issueEventId===e.id));}
function render(){clear();if(document.body.dataset.nexusLayer!=="loto"||!api())return;const grouped=new Map();openIssues().forEach(i=>{if(!i.equipmentId)return;const a=grouped.get(i.equipmentId)||[];a.push(i);grouped.set(i.equipmentId,a);});grouped.forEach((issues,id)=>{const n=nodeFor(id);if(!n)return;n.classList.add("nx-loto-has-issue");const b=document.createElement("button");b.type="button";b.className="nx-loto-issue-marker";b.textContent=String(issues.length);b.title=issues.length+" open LOTO issue"+(issues.length===1?"":"s")+" — tap to review";b.addEventListener("click",e=>{e.stopPropagation();window.dispatchEvent(new CustomEvent("nexus:loto-issue-open",{detail:{issueId:issues[0].id,equipmentId:id}}));});n.appendChild(b);});}
window.addEventListener("nexus:loto-change",render);window.addEventListener("nexus:layerchange",render);window.addEventListener("nexus:loto-topology-view",render);window.addEventListener("resize",render);setTimeout(render,0);
})();