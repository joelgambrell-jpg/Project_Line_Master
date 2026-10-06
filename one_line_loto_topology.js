/**
 * NEXUS LOTO TOPOLOGY ADVISORY
 * Rule: connection.from = upstream/source, connection.to = downstream/load.
 * This visualizes recorded topology only. It does not determine electrical safety.
 */
(function(){"use strict";
function getState(){const w=window.nexusOneLineWorkspace;return w&&typeof w.getState==="function"?w.getState():null;}
function build(){const s=getState()||{},cs=Array.isArray(s.connections)?s.connections:[],out=new Map();cs.forEach(c=>{const a=String(c.from||""),b=String(c.to||"");if(!a||!b)return;if(!out.has(a))out.set(a,[]);out.get(a).push(b);});return{connections:cs,out};}
function reach(start,g){const seen=new Set(),q=[String(start||"")];while(q.length){const n=q.shift();if(!n||seen.has(n))continue;seen.add(n);(g.out.get(n)||[]).forEach(x=>{if(!seen.has(x))q.push(x);});}return seen;}
function analyze(loto){const g=build(),pts=Array.isArray(loto&&loto.isolationPoints)?loto.isolationPoints:[],iso=new Set(pts.map(p=>String(p.equipmentId||"")).filter(Boolean)),covered=new Set(),perPoint=[];pts.forEach(p=>{const r=reach(p.equipmentId,g);r.forEach(x=>covered.add(x));perPoint.push({isolationPointId:p.id,equipmentId:p.equipmentId,downstreamEquipmentIds:Array.from(r)});});
const incoming=[];g.connections.forEach(c=>{const from=String(c.from||""),to=String(c.to||"");if(!covered.has(to)||covered.has(from)||iso.has(to))return;incoming.push({connectionId:String(c.id||""),from,to});});
return{directionRule:"from=upstream/source,to=downstream/load",downstreamEquipmentIds:Array.from(covered),perPoint,additionalIncomingConnections:incoming};}
window.NEXUSLotoTopology={getState,analyze};
})();