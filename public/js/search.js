import {stationSearch} from "./api.js";
export function attachStationSearch(input,box){
 let timer,seq=0;
 input.addEventListener("input",()=>{
  clearTimeout(timer); const q=input.value.trim(); const my=++seq;
  input.dataset.code="";
  if(q.length<3){box.classList.remove("show");box.innerHTML="";return}
  timer=setTimeout(async()=>{
   try{
    const rows=await stationSearch(q); if(my!==seq)return;
    const list=Array.isArray(rows)?rows:(rows.data||rows.stations||[]);
    box.innerHTML=list.map(s=>{const code=s.code||s.stationCode||s.stnCode;const name=s.name||s.stationName||s.stnName;return `<div class="option" data-code="${code}" data-name="${name}"><b>${code}</b> — ${name}</div>`}).join("")||'<div class="option muted">No official match returned</div>';
    box.querySelectorAll("[data-code]").forEach(x=>x.onclick=()=>{input.value=`${x.dataset.name} (${x.dataset.code})`;input.dataset.code=x.dataset.code;box.classList.remove("show")});
    box.classList.add("show");
   }catch(e){box.innerHTML=`<div class="option muted">${e.message}</div>`;box.classList.add("show")}
  },250);
 });
}