(function(){
"use strict";
let activeLotoId="";
function api(){return window.NEXUSOneLineLayers;}
function uid(p){return p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);}
function now(){return new Date().toISOString();}
function equipmentId(node){const x=node&&node.querySelector(".id");return x?String(x.textContent||"").trim():"";}
function stop(){activeLotoId="";document.body.classList.remove("nx-loto-plotting");document.querySelectorAll(".nx-loto-plot-banner").forEach(x=>x.remove());}
function start(e){
 const a=api();if(!a)return;const d=a.loadLoto(),open=d.lotos.filter(x=>x&&x.status!=="closed");if(!open.length)return;
 const requested=e&&e.detail&&e.detail.lotoId;const l=open.find(x=>x.id===requested)||open[0];activeLotoId=l.id;document.body.classList.add("nx-loto-plotting");
 let b=document.querySelector(".nx-loto-plot-banner");if(!b){b=document.createElement("div");b.className="nx-loto-plot-banner";document.body.appendChild(b);}
 b.innerHTML="<strong>PLOT LOTO POINTS</strong><span>Tap equipment on the One-Line to add an isolation point.</span><button type='button'>DONE</button>";b.querySelector("button").onclick=stop;
}
document.addEventListener("click",function(e){
 if(!activeLotoId)return;const node=e.target.closest(".nexus-one-line .node");if(!node)return;
 e.preventDefault();e.stopPropagation();const eq=equipmentId(node);if(!eq)return;const a=api(),d=a.loadLoto(),l=d.lotos.find(x=>x.id===activeLotoId&&x.status!=="closed");if(!l)return;
 if(!Array.isArray(l.isolationPoints))l.isolationPoints=[];if(l.isolationPoints.some(p=>p&&String(p.equipmentId)===eq))return;
 const t=now(),actor=l.lotoCoordinator||"LOTO Coordinator",p={id:uid("isolation"),equipmentId:eq,status:"identified",identifiedAt:t,identifiedBy:actor,locked:false,verifiedDeenergized:false};
 l.isolationPoints.push(p);l.boundaryAcceptance={accepted:false,invalidatedAt:t,invalidatedBy:actor,invalidationReason:"Isolation point added from One-Line"};
 d.events.push({id:uid("event"),type:"ISOLATION_POINT_IDENTIFIED",timestamp:t,actor,layer:"loto",recordId:p.id,lotoId:l.id,lotoNumber:l.lotoNumber,equipmentId:eq,payload:{note:"Plotted from One-Line"}});
 a.saveLoto(d);node.classList.add("nx-loto-isolation");window.dispatchEvent(new CustomEvent("nexus:loto-isolation-request",{detail:{lotoId:l.id}}));
},true);
window.addEventListener("nexus:loto-plot-request",start);
window.addEventListener("nexus:layerchange",e=>{if(!e.detail||e.detail.layer!=="loto")stop();});
})();