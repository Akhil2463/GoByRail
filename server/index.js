import express from "express";
import cors from "cors";
const app=express(); app.use(cors()); app.use(express.json()); app.use(express.static("public"));

const URLS={
 stations:"https://raw.githubusercontent.com/datameet/railways/master/stations.json",
 trains:"https://raw.githubusercontent.com/datameet/railways/master/trains.json",
 schedules:"https://raw.githubusercontent.com/datameet/railways/master/schedules.json"
};
let db={stations:[],trains:[],schedules:[],byTrain:new Map(),ready:false,error:null};

async function load(){
 try{
  console.log("Loading railway dataset...");
  const [sr,tr,cr]=await Promise.all(Object.values(URLS).map(u=>fetch(u)));
  if(!sr.ok||!tr.ok||!cr.ok) throw Error("Could not download public timetable dataset");
  const [sj,tj,cj]=await Promise.all([sr.json(),tr.json(),cr.json()]);
  db.stations=(sj.features||[]).map(x=>x.properties).filter(x=>x.code&&x.name);
  db.trains=(tj.features||[]).map(x=>x.properties).filter(x=>x.number);
  db.schedules=cj;
  for(const x of db.schedules){const n=String(x.train_number);if(!db.byTrain.has(n))db.byTrain.set(n,[]);db.byTrain.get(n).push(x)}
  for(const rows of db.byTrain.values())rows.sort((a,b)=>(+a.day||1)-(+b.day||1)||String(a.departure).localeCompare(String(b.departure)));
  db.ready=true; console.log(`Ready: ${db.stations.length} stations, ${db.trains.length} trains, ${db.schedules.length} schedule stops`);
 }catch(e){db.error=e.message;console.error(e)}
}
load();

app.get("/api/health",(req,res)=>res.json({ready:db.ready,error:db.error,stations:db.stations.length,trains:db.trains.length,scheduleStops:db.schedules.length}));
app.get("/api/stations",(req,res)=>{
 const q=String(req.query.q||"").trim().toLowerCase(); if(q.length<3)return res.json([]);
 const famous={
  "CSTM":1000,"MMCT":990,"BCT":980,"BDTS":970,"LTT":960,
  "NDLS":950,"DLI":940,"HWH":930,"SDAH":920,"MAS":910,
  "SBC":900,"KSR":895,"SC":890,"HYB":880,"VSKP":870,
  "BZA":860,"PUNE":850,"ADI":840,"JP":830,"LKO":820,
  "PNBE":810,"CNB":800,"BBS":790,"ERS":780,"TVC":770
 };
 const scored=[];
 for(const st of db.stations){
   const n=st.name.toLowerCase(),c=st.code.toLowerCase();
   let match=0;
   if(n.startsWith(q))match=400;
   else if(c.startsWith(q))match=350;
   else if(n.split(/\s+/).some(w=>w.startsWith(q)))match=300;
   else if(n.includes(q))match=200;
   else if(c.includes(q))match=150;
   if(match)scored.push({st,score:match+(famous[String(st.code).toUpperCase()]||0)});
 }
 scored.sort((a,b)=>b.score-a.score||a.st.name.localeCompare(b.st.name));
 res.json(scored.slice(0,20).map(x=>x.st));
});
app.get("/api/trains-between",(req,res)=>{
 const from=String(req.query.from||"").toUpperCase(),to=String(req.query.to||"").toUpperCase(),out=[];
 for(const [number,rows] of db.byTrain){
  let fi=-1,ti=-1; for(let i=0;i<rows.length;i++){const c=String(rows[i].station_code).toUpperCase();if(c===from&&fi<0)fi=i;if(c===to&&fi>=0&&i>fi){ti=i;break}}
  if(fi>=0&&ti>fi){const f=rows[fi],t=rows[ti],meta=db.trains.find(x=>String(x.number)===number)||{};out.push({number,name:meta.name||f.train_name,departure:f.departure,arrival:t.arrival,fromDay:f.day,toDay:t.day,type:meta.type||"",distance:meta.distance||null})}
 }
 res.json(out);
});
app.get("/api/train/:number/schedule",(req,res)=>res.json(db.byTrain.get(String(req.params.number))||[]));
app.get("/api/train/:number/live",(req,res)=>res.status(501).json({error:"Real-time movement is not fabricated. Connect an authorized live railway API for this feature."}));
app.listen(process.env.PORT||3000,()=>console.log(`Open http://localhost:${process.env.PORT||3000}`));
