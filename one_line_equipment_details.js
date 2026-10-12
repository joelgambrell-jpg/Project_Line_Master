/**
 * Unified read-only equipment inspector. Values come from supplied equipment
 * records and persisted operational stores; diagram demo values are excluded.
 */
(function () {
"use strict";
let selected = null, previousFocus = null, dialog;
const list = v => Array.isArray(v) ? v.filter(Boolean) : [];
const eq = (a,b) => a != null && b != null && String(a) === String(b);
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function time(v) {
 if (v == null || v === "") return "Unknown date/time";
 // A date without an explicit offset is not a recorded UTC instant.
 if (typeof v !== "string" || !/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(v)) return "Unknown date/time (stored: "+esc(v)+")";
 const d = new Date(v);
 if (!Number.isFinite(d.getTime())) return "Unknown date/time (stored: "+esc(v)+")";
 return esc(new Intl.DateTimeFormat(undefined,{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",timeZoneName:"long"}).format(d))+
 "<br><small>UTC: "+esc(d.toISOString())+" · Stored timestamp: "+esc(v)+"</small>";
}
function fields(o) {
 if (!o || typeof o !== "object") return "<p>No persisted details available.</p>";
 return "<dl>"+Object.entries(o).map(([k,v])=>"<dt>"+esc(k)+"</dt><dd>"+
 (/At$|timestamp$|date$/i.test(k) ? time(v) : v && typeof v==="object" ? "<pre>"+esc(JSON.stringify(v,null,2))+"</pre>" : esc(v == null || v === "" ? "Unknown" : v))+"</dd>").join("")+"</dl>";
}
function section(title,content) {return "<section><h3>"+esc(title)+"</h3>"+content+"</section>";}
function empty(items,render) {return items.length ? items.map(render).join("") : "<p>No associated persisted records.</p>";}
function coverage(l,id) {
 const b=l.boundaryAcceptance||{};
 return eq(l.equipmentId,id)||list(l.equipmentIds).some(x=>eq(x,id))||
 list(l.isolationPoints).some(x=>eq(x.equipmentId,id))||eq(l.isolationPoint,id)||
 list(b.isolationPointSnapshot).some(x=>eq(x.equipmentId,id))||
 (b.accepted===true && list(b.downstreamEquipmentIds).some(x=>eq(x,id)));
}
function read(key) {try {return JSON.parse(localStorage.getItem(key)||"null");}catch(e){return null;}}
function render() {
 if(!selected || !dialog.open) return;
 const {equipmentId:id,equipment,context:c}=selected;
 const api=window.NEXUSOneLineLayers;
 const permitted=!api || api.can("loto","view");
 // Read the selected workspace's store, not a potentially different URL context.
 const d=permitted ? read("nexus-one-line-loto-v1:"+c.projectId+":"+c.buildingId)||{} : {};
 const locks=list(d.personalLocks),events=list(d.events),lotos=list(d.lotos);
 const ids=new Set(lotos.filter(l=>coverage(l,id)).map(l=>String(l.id)));
 locks.filter(l=>eq(l.equipmentId,id)).forEach(l=>{if(l.lotoId!=null)ids.add(String(l.lotoId));});
 events.filter(e=>eq(e.equipmentId,id)).forEach(e=>{if(e.lotoId!=null)ids.add(String(e.lotoId));});
 const associated=lotos.filter(l=>ids.has(String(l.id)));
 const linkedLocks=locks.filter(l=>eq(l.equipmentId,id)||ids.has(String(l.lotoId)));
 const lockIds=new Set(linkedLocks.map(l=>String(l.id)));
 const audit=events.filter(e=>eq(e.equipmentId,id)||ids.has(String(e.lotoId))||lockIds.has(String(e.recordId)));
 const current=linkedLocks.filter(l=>String(l.status||"").toLowerCase()==="active"&&!l.removedAt);
 const history=linkedLocks.filter(l=>!current.includes(l));
 const energy=read("nexus-one-line-energized-v1:"+c.projectId+":"+c.buildingId);
 const scroll=dialog.querySelector(".nx-equipment-body");
 const top=scroll ? scroll.scrollTop : 0;
 let html=section("Equipment identity",fields({equipmentId:id,...c})+fields(equipment));
 html+=section("QC / readiness",equipment ? fields(Object.fromEntries(Object.entries(equipment).filter(([k])=>/qc|quality|readiness|progress|percent|completion/i.test(k)))) : "<p>No persisted QC / readiness data available. Diagram sample colors are not records.</p>");
 html+=section("Recorded energization",energy && Object.prototype.hasOwnProperty.call(energy,id) ? fields(energy[id]) : "<p>Unknown — no persisted energization record. Absence does not establish a de-energized state.</p>");
 if(permitted) {
 html+=section("All associated LOTO records",empty(associated,l=>"<article>"+fields(l)+"</article>"));
 html+=section("People currently recorded on LOTO",empty(current,l=>"<article><h4>"+esc(l.personName||l.personId||"Unknown person")+"</h4><p>Lock applied: "+time(l.appliedAt)+"</p>"+fields(l)+"</article>"));
 html+=section("Removed locks / other lock history",empty(history,l=>"<article><p>Applied: "+time(l.appliedAt)+"</p><p>Removed: "+time(l.removedAt)+"</p>"+fields(l)+"</article>"));
 html+=section("Isolation points",empty(associated,l=>"<article><h4>"+esc(l.lotoNumber||l.id)+"</h4>"+empty(list(l.isolationPoints),fields)+(l.isolationPoint?"<p>"+esc(l.isolationPoint)+"</p>":"")+section("Recorded boundary snapshot",fields(l.boundaryAcceptance))+"</article>"));
 html+=section("Event audit trail",empty(audit.slice().sort((a,b)=>String(b.timestamp||"").localeCompare(String(a.timestamp||""))),e=>"<article><h4>"+esc(e.type||"Unknown event")+"</h4><p>"+time(e.timestamp)+"</p>"+fields(e)+"</article>"));
 } else html+=section("LOTO","<p>LOTO records are unavailable with current permissions.</p>");
 dialog.querySelector("h2").textContent=id;
 dialog.querySelector(".nx-equipment-body").innerHTML=html;
 dialog.querySelector(".nx-equipment-body").scrollTop=top;
}
function close() {if(!dialog || !dialog.open)return;dialog.close();selected=null;document.body.classList.remove("nx-equipment-open");if(previousFocus&&previousFocus.isConnected)previousFocus.focus();}
function open(detail) {
 if(!detail || !detail.equipmentId)return;
 const api=window.NEXUSOneLineLayers;
 const c=detail.context||(api&&api.context());
 if(!c)return;
 selected={...detail,context:c};
 if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();document.body.classList.add("nx-equipment-open");}
 render();dialog.querySelector("[data-close]").focus();
}
function install() {
 dialog=document.createElement("dialog");dialog.className="nx-equipment-dialog";
 dialog.setAttribute("aria-labelledby","nx-equipment-title");
 dialog.innerHTML='<header><div><small>EQUIPMENT RECORDS</small><h2 id="nx-equipment-title"></h2></div><button type="button" data-close aria-label="Close equipment details">Close</button></header><p class="nx-equipment-notice">Recorded information only. This display does not establish physical isolation, absence of voltage, or safety to work. Missing dates are unknown.</p><div class="nx-equipment-body"></div>';
 document.body.appendChild(dialog);
 dialog.querySelector("[data-close]").addEventListener("click",close);
 dialog.addEventListener("cancel",e=>{e.preventDefault();close();});
 dialog.addEventListener("click",e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 window.addEventListener("nexus:equipment-selected",e=>open(e.detail));
 window.addEventListener("nexus:open-equipment",e=>open(e.detail));
 ["storage","nexus:loto-change","nexus-one-line-energized-change"].forEach(type=>window.addEventListener(type,render));
 // Existing operational workflows regain their drawers when invoked.
 ["nexus:layerchange","nexus:loto-start-request","nexus:loto-history-request","nexus:loto-add-person-request","nexus:loto-remove-person-request","nexus:loto-isolation-request"].forEach(type=>window.addEventListener(type,close));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
