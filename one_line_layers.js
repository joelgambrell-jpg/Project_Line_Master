/*
 * NEXUS ONE-LINE OPERATIONAL LAYERS
 * Stage 2: layer behavior and first read-only LOTO operational surface.
 * The SME-built topology is never rewritten by an operational layer.
 */
(function(){
  "use strict";
  const LAYERS=["base","readiness","energization","loto"];
  const OWNERS={base:"SME / Engineering",readiness:"Quality / Readiness",energization:"Energization",loto:"LOTO Coordinator"};
  const LOTO_PREFIX="nexus-one-line-loto-v1:";
  function params(){return new URLSearchParams(location.search);}
  function context(){const q=params();return{projectId:q.get("project")||"sample-project",buildingId:q.get("building")||"A",diagramId:q.get("diagram")||"overall"};}
  function getRequestedLayer(){const q=params().get("layer");return LAYERS.includes(q)?q:"base";}
  function permissionName(layer,action){return(action||"view")+"_"+(layer==="base"?"oneline":layer);}
  function can(layer,action){const hook=window.NEXUS_LAYER_PERMISSIONS;if(!hook)return true;if(hook.superUser===true)return true;return hook[permissionName(layer,action)]!==false;}
  function lotoKey(c){return LOTO_PREFIX+c.projectId+":"+c.buildingId;}
  function loadLoto(c){try{const raw=JSON.parse(localStorage.getItem(lotoKey(c))||"{}");return{lotos:Array.isArray(raw.lotos)?raw.lotos:[],personalLocks:Array.isArray(raw.personalLocks)?raw.personalLocks:[],events:Array.isArray(raw.events)?raw.events:[]};}catch(e){console.warn("[NEXUS LOTO] load failed",e);return{lotos:[],personalLocks:[],events:[]};}}
  function saveLoto(c,records){localStorage.setItem(lotoKey(c),JSON.stringify(records));window.dispatchEvent(new CustomEvent("nexus:loto-change",{detail:{context:c}}));return records;}
  function summarizeLoto(records){
    const active=records.lotos.filter(x=>x&&x.status!=="closed");
    const locks=records.personalLocks.filter(x=>x&&x.status!=="removed");
    const people=new Set(locks.map(x=>x.personId||x.personName).filter(Boolean));
    const equipment=new Set(locks.map(x=>x.equipmentId).filter(Boolean));
    return{lotos:active.length,locks:locks.length,people:people.size,equipment:equipment.size};
  }
  function install(){
    const host=document.getElementById("oneLineWorkspaceHost");if(!host||document.querySelector(".nx-layer-bar"))return;
    const bar=document.createElement("nav");bar.className="nx-layer-bar";bar.setAttribute("aria-label","One-Line operational layers");
    bar.innerHTML='<span class="nx-layer-label">View Layer</span><div class="nx-layer-tabs"></div><span class="nx-layer-spacer"></span><span class="nx-layer-mode">Data owner: <strong></strong></span>';
    const tabs=bar.querySelector(".nx-layer-tabs");
    [["base","One-Line"],["readiness","Readiness"],["energization","Energization"],["loto","LOTO"]].forEach(([id,label])=>{const b=document.createElement("button");b.type="button";b.className="nx-layer-tab";b.dataset.layer=id;b.textContent=label;b.disabled=!can(id,"view");b.addEventListener("click",()=>setLayer(id));tabs.appendChild(b);});
    const drawer=document.createElement("section");drawer.className="nx-layer-drawer";drawer.setAttribute("aria-live","polite");
    host.parentNode.insertBefore(bar,host);host.parentNode.insertBefore(drawer,host);
    function renderDrawer(layer){
      if(layer==="base"){drawer.innerHTML="";return;}
      if(layer==="readiness"){drawer.innerHTML='<div class="nx-layer-summary"><strong>Readiness</strong><span>QC completion status over the approved SME One-Line. Topology remains read-only to this layer.</span></div>';return;}
      if(layer==="energization"){drawer.innerHTML='<div class="nx-layer-summary"><strong>Energization</strong><span>Shows confirmed energized state independently from QC completion. Topology remains owned by SME / Engineering.</span></div>';return;}
      const s=summarizeLoto(loadLoto(context()));
      drawer.innerHTML='<div class="nx-loto-overview"><div class="nx-loto-title"><strong>LOTO CONTROL</strong><span>Controlled operational layer</span></div>'+
        '<div class="nx-loto-metrics"><div><b>'+s.people+'</b><span>People on LOTO</span></div><div><b>'+s.lotos+'</b><span>Active LOTOs</span></div><div><b>'+s.locks+'</b><span>Personal Locks</span></div><div><b>'+s.equipment+'</b><span>Equipment</span></div></div>'+
        '<div class="nx-loto-actions"><button type="button" class="nx-loto-start" data-loto-action="start">+ Start LOTO</button><button type="button" data-loto-action="add-person">+ Add Person / Lock</button><button type="button" data-loto-action="remove-person">Remove Person / Lock</button><button type="button" data-loto-action="exception-remove">Exceptional Lock Removal</button><button type="button" data-loto-action="isolation">Isolation Points</button><button type="button" data-loto-action="handoff">Coordinator Handoff</button><button type="button" data-loto-action="issue">Flag Issue</button><button type="button" data-loto-action="progress">Release / Restore</button><button type="button" data-loto-action="find">Find Person / Equipment</button><button type="button" data-loto-action="history">History</button><button type="button" data-loto-action="fit">Fit Active LOTO</button></div></div>';
    }
    function setLayer(layer){
      if(!LAYERS.includes(layer)||!can(layer,"view"))return;
      document.body.dataset.nexusLayer=layer;
      tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.layer===layer)));
      bar.querySelector(".nx-layer-mode strong").textContent=OWNERS[layer];
      drawer.classList.toggle("is-open",layer!=="base");renderDrawer(layer);
      const url=new URL(location.href);if(layer==="base")url.searchParams.delete("layer");else url.searchParams.set("layer",layer);history.replaceState(null,"",url);
      window.dispatchEvent(new CustomEvent("nexus:layerchange",{detail:{layer,owner:OWNERS[layer]}}));
    }
    drawer.addEventListener("click",e=>{const action=e.target&&e.target.dataset&&e.target.dataset.lotoAction;if(action==="fit"&&window.nexusOneLineWorkspace&&typeof window.nexusOneLineWorkspace.fit==="function")window.nexusOneLineWorkspace.fit();if(action==="find")window.dispatchEvent(new CustomEvent("nexus:loto-find-request"));if(action==="history"&&can("loto","history"))window.dispatchEvent(new CustomEvent("nexus:loto-history-request"));if(action==="start"&&can("loto","manage"))window.dispatchEvent(new CustomEvent("nexus:loto-start-request"));if(action==="add-person"&&can("loto","participate"))window.dispatchEvent(new CustomEvent("nexus:loto-add-person-request"));if(action==="remove-person"&&can("loto","participate"))window.dispatchEvent(new CustomEvent("nexus:loto-remove-person-request"));if(action==="exception-remove"&&can("loto","manage"))window.dispatchEvent(new CustomEvent("nexus:loto-exception-remove-request"));if(action==="isolation"&&can("loto","manage"))window.dispatchEvent(new CustomEvent("nexus:loto-isolation-request"));if(action==="handoff"&&can("loto","manage"))window.dispatchEvent(new CustomEvent("nexus:loto-handoff-request"));if(action==="issue")window.dispatchEvent(new CustomEvent("nexus:loto-issue-request"));if(action==="progress"&&can("loto","manage"))window.dispatchEvent(new CustomEvent("nexus:loto-progress-request"));});
    window.addEventListener("storage",e=>{if(e.key===lotoKey(context())&&document.body.dataset.nexusLayer==="loto")renderDrawer("loto");});
    window.addEventListener("nexus:loto-change",()=>{if(document.body.dataset.nexusLayer==="loto")renderDrawer("loto");});
    window.NEXUSOneLineLayers={setLayer,can,owners:{...OWNERS},getLayer:()=>document.body.dataset.nexusLayer||"base",loadLoto:()=>loadLoto(context()),saveLoto:(records)=>saveLoto(context(),records),context:()=>({...context()})};
    setLayer(getRequestedLayer());
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();