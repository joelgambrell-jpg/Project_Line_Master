const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader("Content-Type",file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html");res.end(data);});
 }).listen(0,"127.0.0.1");
 await new Promise(r=>server.once("listening",r));
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage({viewport:{width:768,height:1024},isMobile:true,hasTouch:true});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.addInitScript(()=>{
 localStorage.setItem("nexus-one-line-loto-v1:sample-project:A",JSON.stringify({
 lotos:[{id:"L1",equipmentIds:["1A01A"],status:"active",isolationPoints:[{equipmentId:"1A02A"}]},{id:"L2",equipmentId:"1A01A",status:"closed"}],
 personalLocks:[{id:"P1",lotoId:"L1",equipmentId:"1A02A",status:"active",personName:"Test Person",lockId:"K1",appliedAt:"2026-10-12T12:34:56Z"},{id:"P2",lotoId:"L2",status:"removed",personName:"Removed Person",removedAt:"2026-10-12T13:00:00Z"}],
 events:[{id:"E1",lotoId:"L1",type:"PERSONAL_LOCK_APPLIED",timestamp:"2026-10-12T12:34:56Z",actor:"Test Person"}]}));
 });
 await page.goto("http://127.0.0.1:"+server.address().port+"/one_line_diagram.html?mode=view&viewer=1");
 await page.waitForSelector(".node");
 for(const layer of ["base","readiness","energization","loto","everything"]){
  await page.evaluate(layer=>window.NEXUSOneLineLayers.setLayer(layer),layer);
  await page.locator(".node").filter({has:page.locator(".id",{hasText:"1A01A"})}).first().dispatchEvent("click");
  const popup=page.locator(".nx-equipment-dialog");
  await popup.waitFor({state:"visible"});
  const text=await popup.innerText();
  for(const value of ["Test Person","Removed Person","L2","K1","2026-10-12T12:34:56Z","Unknown date/time","Event audit trail","does not establish physical isolation"])assert(text.includes(value),value+" missing in "+layer);
  assert(text.includes("No persisted QC / readiness"),"sample QC must be excluded");
  assert(await popup.locator(".nx-equipment-body").evaluate(el=>{el.scrollTop=200;return el.scrollTop>0&&getComputedStyle(el).touchAction==="pan-y";}),"iPad scrolling");
  await page.keyboard.press("Escape");
  assert.equal(await popup.isVisible(),false);
 }
 assert.deepEqual(errors,[]);
 console.log("PASS: all five layers, persisted LOTO association, UTC/missing dates, sample exclusion, iPad scrolling, Escape; no browser errors.");
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
