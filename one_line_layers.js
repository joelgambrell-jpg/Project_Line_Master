/*
 * NEXUS ONE-LINE OPERATIONAL LAYER SHELL
 * Stage 1: navigation + ownership boundary hooks only.
 * No layer is allowed to rewrite SME topology.
 */
(function(){
  "use strict";
  const LAYERS=["base","readiness","energization","loto"];
  const OWNERS={base:"SME / Engineering",readiness:"Quality / Readiness",energization:"Energization",loto:"Energy Marshal"};
  function getRequestedLayer(){const q=new URLSearchParams(location.search).get("layer");return LAYERS.includes(q)?q:"base";}
  function permissionName(layer,action){return (action||"view")+"_"+(layer==="base"?"oneline":layer);}
  function can(layer,action){
    const hook=window.NEXUS_LAYER_PERMISSIONS;
    if(!hook)return true; // development: Firebase enforcement comes later
    if(hook.superUser===true)return true;
    const key=permissionName(layer,action);
    return hook[key]!==false;
  }
  function install(){
    const host=document.getElementById("oneLineWorkspaceHost"); if(!host||document.querySelector(".nx-layer-bar"))return;
    const bar=document.createElement("nav");bar.className="nx-layer-bar";bar.setAttribute("aria-label","One-Line operational layers");
    bar.innerHTML='<span class="nx-layer-label">View Layer</span><div class="nx-layer-tabs"></div><span class="nx-layer-spacer"></span><span class="nx-layer-mode">Data owner: <strong></strong></span>';
    const tabs=bar.querySelector(".nx-layer-tabs");
    [["base","One-Line"],["readiness","Readiness"],["energization","Energization"],["loto","LOTO"]].forEach(([id,label])=>{
      const b=document.createElement("button");b.type="button";b.className="nx-layer-tab";b.dataset.layer=id;b.textContent=label;b.disabled=!can(id,"view");b.addEventListener("click",()=>setLayer(id));tabs.appendChild(b);
    });
    const drawer=document.createElement("section");drawer.className="nx-layer-drawer";drawer.setAttribute("aria-live","polite");
    host.parentNode.insertBefore(bar,host);host.parentNode.insertBefore(drawer,host);
    function setLayer(layer){
      if(!LAYERS.includes(layer)||!can(layer,"view"))return;
      document.body.dataset.nexusLayer=layer;
      tabs.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.layer===layer)));
      bar.querySelector(".nx-layer-mode strong").textContent=OWNERS[layer];
      drawer.classList.toggle("is-open",layer!=="base");
      if(layer==="readiness")drawer.innerHTML='<div class="nx-layer-summary"><strong>Readiness Layer</strong><span>QC completion and readiness status over the SME-built One-Line.</span></div>';
      if(layer==="energization")drawer.innerHTML='<div class="nx-layer-summary"><strong>Energization Layer</strong><span>Energization state and controls remain separate from topology and readiness ownership.</span></div>';
      if(layer==="loto")drawer.innerHTML='<div class="nx-layer-summary"><strong>LOTO Layer</strong><span class="nx-layer-loto-chip">LOTO operational overlay</span><span>ACE LOTO, personal locks, people and isolation boundaries will be added here in the next stage.</span></div>';
      if(layer==="base")drawer.innerHTML="";
      window.dispatchEvent(new CustomEvent("nexus:layerchange",{detail:{layer,owner:OWNERS[layer]}}));
    }
    window.NEXUSOneLineLayers={setLayer,can,owners:{...OWNERS},getLayer:()=>document.body.dataset.nexusLayer||"base"};
    setLayer(getRequestedLayer());
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
