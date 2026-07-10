export async function getJSON(url){const r=await fetch(url);const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Request failed: ${r.status}`);return data}
export const stationSearch=q=>getJSON(`/api/stations?q=${encodeURIComponent(q)}`);
export const trainsBetween=(from,to,date)=>getJSON(`/api/trains-between?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`);
export const schedule=(n,date)=>getJSON(`/api/train/${encodeURIComponent(n)}/schedule?date=${encodeURIComponent(date)}`);
export const live=(n,date)=>getJSON(`/api/train/${encodeURIComponent(n)}/live?date=${encodeURIComponent(date)}`);