const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async()=>{
 const root=process.cwd();
 const server=http.createServer((req,res)=>{
  const file=path.resolve(root,"."+new URL(req.url,"http://localhost").pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader("Content-Type",file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html");res.end(data);});
 }).listen(0,"127.0.0.1");
 await new Promise(r=>server.once("listening",r));
 try {
 for(const [browserName,browserType] of [["Chromium",chromium],["WebKit",webkit]]) {
 const browser=await browserType.launch();
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
 for(const viewport of [{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]) {
 await page.setViewportSize(viewport);
 for(const layer of ["base","readiness","energization","loto","everything"]){
  await page.evaluate(layer=>window.NEXUSOneLineLayers.setLayer(layer),layer);
  await page.evaluate(()=>window.nexusOneLineWorkspace.fitEquipment(["1A01A"]));
  await page.locator(".node").filter({has:page.locator(".id",{hasText:"1A01A"})}).first().tap();
  const popup=page.locator(".nx-equipment-dialog");
  await popup.waitFor({state:"visible"});
  const text=await popup.innerText();
  for(const value of ["Test Person","Removed Person","L2","K1","2026-10-12T12:34:56Z","Unknown date/time","Event audit trail","does not establish physical isolation"])assert(text.includes(value),value+" missing in "+layer);
  assert(text.includes("No persisted QC / readiness"),"sample QC must be excluded");
  assert(await popup.locator(".nx-equipment-body").evaluate(el=>{el.scrollTop=200;return el.scrollTop>0&&getComputedStyle(el).touchAction==="pan-y";}),"iPad scrolling");
  const bounds=await popup.boundingBox();
  assert(Math.abs(bounds.x+bounds.width/2-viewport.width/2)<2,"pop-out centered horizontally");
  assert(Math.abs(bounds.y+bounds.height/2-viewport.height/2)<2,"pop-out centered vertically");
  const close=popup.locator("header [data-equipment-close]");
  const before=await close.boundingBox();
  await popup.locator(".nx-equipment-body").evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const after=await close.boundingBox();
  assert.equal(after.y,before.y,"Close remains visible while content scrolls");
  await close.tap();
  assert.equal(await popup.isVisible(),false);
  assert.equal(await page.locator(".nx-loto-equipment-panel:visible").count(),0,"no equipment sidebar after closing");
  assert.equal(await page.locator(".nx-loto-guide:visible").count(),0,"idle LOTO banner does not cover diagram");
  assert(await page.locator(".one-line-host").evaluate(el=>{
   const style=getComputedStyle(el);
   return parseFloat(style.marginRight)===0&&parseFloat(style.marginBottom)===0;
  }),"no space reserved for retired drawer");
  assert.equal(await page.evaluate(()=>document.body.classList.contains("nx-equipment-open")),false);
 }
 }
 await page.evaluate(()=>window.nexusOneLineWorkspace.setEquipment([{equipmentId:"1A01A",type:"UPS",progress:{percent:75},qcStatus:"Pending review"}]));
 await page.evaluate(()=>window.nexusOneLineWorkspace.openEquipment("1A01A"));
 assert((await page.locator(".nx-equipment-dialog").innerText()).includes("Pending review"),"controller must use shared equipment data");
 await page.keyboard.press("Escape");
 assert.deepEqual(errors,[]);
 console.log("PASS "+browserName+": real taps in all five layers at iPad portrait/landscape and desktop sizes; centered pop-out, internal scrolling, fixed Close, full diagram restored, persisted data and Escape.");
 }finally{await browser.close();}
 }
 } finally {server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
