import {attachStationSearch} from "./search.js";import {trainsBetween,schedule} from "./api.js";

function currentAccountKey(){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 return session?.email?`railBookings:${session.email.toLowerCase()}`:null;
}
function loadAccountBookings(){
 const key=currentAccountKey();
 return key?JSON.parse(localStorage.getItem(key)||"[]"):[];
}
function saveAccountBookings(){
 const key=currentAccountKey();
 if(key)localStorage.setItem(key,JSON.stringify(bookings));
}
function formatTime12(value){
 if(value===null||value===undefined)return "--";
 const raw=String(value).trim();
 if(/AM|PM/i.test(raw))return raw.replace(/:\d{2}\s*(AM|PM)$/i," $1");
 const m=raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
 if(!m)return raw;
 let h=Number(m[1]),min=m[2],period=h>=12?"PM":"AM";
 h=h%12||12;
 return `${h}:${min} ${period}`;
}
function assignBerths(ps,cls){
 const berthTypes=["LB","MB","UB","SL","SU"];
 const coachPrefix={"1A":"H1","2A":"A1","3A":"B1","SL":"S1","CC":"C1"}[cls]||"B1";
 return ps.map((p,i)=>{
   const seat=Math.floor(Math.random()*72)+1;
   const preferred=p.berth&&p.berth!=="No Preference"?p.berth:"Confirmed Berth";
   return {...p,coach:coachPrefix,seat,berthConfirmed:preferred,status:"CNF"};
 });
}

const $=x=>document.getElementById(x),from=$("from"),to=$("to"),status=$("status"),results=$("results"),modal=$("modal"),body=$("modalBody");
let bookings=[],balance=+(localStorage.getItem("balance")||5000),currentTrain=null;
bookings=loadAccountBookings();

function money2(value){return Number(value||0).toFixed(2)}
function renderWalletBalance(){
 const el=$("balance");if(el)el.textContent=money2(balance);
 const stat=$("statWallet");if(stat)stat.textContent=money2(balance);
}
function showWalletSuccess(amount){
 const box=$("walletSuccess");
 $("walletSuccessText").textContent=`Successfully ₹${money2(amount)} added to your wallet.`;
 box.classList.remove("show");void box.offsetWidth;box.classList.add("show");
 setTimeout(()=>box.classList.remove("show"),2200);
}

renderWalletBalance();
attachStationSearch(from,$("fromBox"));attachStationSearch(to,$("toBox"));$("date").value=new Date().toISOString().slice(0,10);renderWalletBalance();
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>show(b.dataset.view));
function show(id){document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");if(id==="bookings")renderBookings()}

const availabilityCache=new Map();

function demoAvailability(n,c){
 const key=n+"-"+c;
 if(availabilityCache.has(key))return availabilityCache.get(key);
 const states=[["AVAILABLE","available"],["RAC","rac"],["WL","waitlist"]];
 const [label,kind]=states[Math.floor(Math.random()*states.length)];
 const number=Math.floor(Math.random()*250)+1;
 const fare={SL:420,CC:680,"3A":1120,"2A":1640,"1A":2780}[c];
 const value={text:`${label} ${number}`,kind,fare};
 availabilityCache.set(key,value);
 return value;
}
function availabilityBox(t,c){
 const x=demoAvailability(t.number,c);
 return `<div class="availBox" data-select="${t.number}" data-class="${c}"><div class="className">${c}</div><div class="${x.kind}">${x.text}</div><div class="muted">₹${x.fare}</div></div>`;
}

function durationBetween(dep,arr,fromDay=1,toDay=1){
 const parse=v=>{const m=String(v||"").match(/^(\d{1,2}):(\d{2})/);return m?(+m[1]*60)+(+m[2]):null};
 const d=parse(dep),a=parse(arr);if(d===null||a===null)return "Duration unavailable";
 let mins=((Number(toDay)||1)-(Number(fromDay)||1))*1440+a-d;
 while(mins<0)mins+=1440;
 const h=Math.floor(mins/60),m=mins%60;
 return `${h}hr ${m}min`;
}

function trainCard(t){
 const dur=durationBetween(t.departure,t.arrival,t.fromDay,t.toDay);
 return `<article class="trainResult"><div class="trainTop"><div><h3>${t.name}</h3><div class="muted">${t.number} • ${t.type||"Train"}</div></div><div class="journeyTiming"><div class="timePoint"><b>${formatTime12(t.departure)}</b><span class="muted">${from.dataset.code}</span></div><div class="durationLine"><span></span><b>${dur}</b><span></span></div><div class="timePoint"><b>${formatTime12(t.arrival)}</b><span class="muted">${to.dataset.code}</span></div></div><button data-route="${t.number}">VIEW ROUTE</button></div><div class="availability">${["1A","2A","3A","SL","CC"].map(c=>availabilityBox(t,c)).join("")}</div></article>`;
}
function renderTrainPage(){
 const showRows=(window.lastRows||[]).slice(0,window.visibleCount||10);
 results.innerHTML=showRows.map(t=>trainCard(t)).join("")||'<div class="card">No scheduled direct train found in the local dataset.</div>';
 document.getElementById("loadMoreWrap").style.display=(window.visibleCount||10)<(window.lastRows||[]).length?"block":"none";
 wireTrainCards();
}
function wireTrainCards(){
 results.querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>openTrain(window.lastRows.find(x=>String(x.number)===b.dataset.route)));
 results.querySelectorAll("[data-select]").forEach(box=>box.onclick=()=>{
   const card=box.closest(".trainResult");
   card.querySelectorAll(".availBox").forEach(x=>x.classList.remove("selected"));
   box.classList.add("selected");
   let bar=card.querySelector(".selectedBookBar");
   if(!bar){bar=document.createElement("div");bar.className="selectedBookBar";card.appendChild(bar)}
   const t=window.lastRows.find(x=>String(x.number)===box.dataset.select);
   const av=demoAvailability(t.number,box.dataset.class);
   bar.innerHTML=`<div><b>${box.dataset.class}</b> • <span class="${av.kind}">${av.text}</span> • ₹${av.fare}</div><button class="bookNowSelected">BOOK NOW</button>`;
   bar.querySelector("button").onclick=()=>startBooking(t,box.dataset.class);
 });
}
document.getElementById("loadMore").onclick=()=>{window.visibleCount=(window.visibleCount||10)+10;renderTrainPage()};

$("go").onclick=async()=>{if(!from.dataset.code||!to.dataset.code){status.textContent="Select both stations from suggestions.";return}status.textContent="Searching timetable…";results.innerHTML="";
try{const rows=await trainsBetween(from.dataset.code,to.dataset.code,$("date").value);status.textContent=`${rows.length} scheduled train(s) found.`;
window.lastRows=rows;window.originalRows=[...rows];window.visibleCount=10;$("trainFilterBar").classList.remove("hidden");const q=JSON.parse(localStorage.getItem("railSearchLog")||"[]");q.push({from:from.dataset.code,to:to.dataset.code});localStorage.setItem("railSearchLog",JSON.stringify(q));renderTrainPage();
}catch(e){status.textContent=e.message}};
async function openTrain(t){currentTrain=t;body.innerHTML=`<h2>${t.name}</h2><p>Train ${t.number} • ${formatTime12(t.departure)} → ${formatTime12(t.arrival)}</p><div class="classes">${["1A","2A","3A","SL","CC"].map(c=>`<button class="classChip" data-class="${c}">${c}</button>`).join("")}</div><div id="routeBox"></div>`;modal.classList.add("show");
body.querySelectorAll("[data-class]").forEach(b=>b.onclick=()=>bookingForm(b.dataset.class));try{const r=await schedule(t.number,$("date").value);$("routeBox").innerHTML=`<h3>Route</h3>${r.slice(0,12).map(x=>`<div>${x.station_code} — ${x.station_name} | Arr ${formatTime12(x.arrival)} Dep ${formatTime12(x.departure)}</div>`).join("")}`}catch{}}

function startBooking(t,cls){currentTrain=t;const av=demoAvailability(t.number,cls);body.className="bookingShell";body.innerHTML=`<div class="bookingHero"><h2>${t.name}</h2><p>${t.number} • ${from.dataset.code} ${formatTime12(t.departure)} → ${to.dataset.code} ${formatTime12(t.arrival)}</p><b>${cls} • <span class="${av.kind}">${av.text}</span></b></div><div class="stepper"><div class="step active">Passenger Details</div><div class="step">Preferences</div><div class="step">Review & Pay</div></div><div class="formSection"><div class="passengerSectionHead"><div><h3>Passenger Details</h3><p class="muted">Add manually or choose from your saved Master Passenger List.</p></div><button id="openMasterPicker" type="button">👥 ADD FROM MASTER LIST</button></div><div id="selectedMasterSummary"></div><div id="premiumPassengers"></div><button id="addPremium">+ Add Passenger Manually</button><p class="muted">Maximum 6 passengers in this academic booking flow.</p></div><div class="formSection"><h3>Booking Preferences</h3><label class="choice"><input id="autoUpgrade" type="checkbox"><div><b>Consider for Auto Upgradation</b><div class="muted">If eligible, consider a higher class when charts are prepared. Project simulation only.</div></div></label><label class="choice"><input id="confirmChoice" type="checkbox"><div><b>Book only if at least one berth is confirmed</b><div class="muted">Preference used by this project booking workflow.</div></div></label><label class="choice"><input id="insurance" type="checkbox" checked><div><b>Travel Insurance</b><div class="muted">₹0.45 per passenger in this project UI. No real policy is issued.</div></div></label><label class="choice"><input id="sameCoach" type="checkbox" checked><div><b>Book passengers in the same coach if possible</b><div class="muted">Seat-allocation preference simulation.</div></div></label></div><div class="formSection"><h3>Contact Details</h3><div class="passengerRow"><input id="mobile" inputmode="numeric" maxlength="10" placeholder="10-digit mobile number *"><input id="email" type="email" maxlength="100" placeholder="Gmail address *" style="grid-column:span 2"><select id="boarding"><option>Boarding: ${from.dataset.code}</option></select></div></div><div class="notice">Availability counts shown here are deterministic project-demo values because the public timetable dataset does not provide live IRCTC seat inventory. They are not presented as real availability.</div><div class="bookBar"><div><span class="muted">Base fare</span><br><b>₹${av.fare} per passenger</b></div><button id="reviewPay">REVIEW & PAY</button></div>`;
modal.classList.add("show");addPremiumPassenger();$("addPremium").onclick=()=>{if(document.querySelectorAll(".passengerRow.premium").length<6)addPremiumPassenger()};$("openMasterPicker").onclick=()=>showMasterPassengerPicker();$("reviewPay").onclick=()=>reviewPremium(t,cls,av)}

function getMasterPassengersForBooking(){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 if(!session)return [];
 return JSON.parse(localStorage.getItem(`railMasterPassengers:${session.email.toLowerCase()}`)||"[]");
}
function showMasterPassengerPicker(){
 const saved=getMasterPassengersForBooking();
 if(!saved.length){
   alert("Your Master Passenger List is empty. Add passengers from Wallet → Smart Account Tools → Master Passenger List.");
   return;
 }
 let picker=document.getElementById("masterPickerPanel");
 if(picker){picker.remove();return}
 picker=document.createElement("div");picker.id="masterPickerPanel";picker.className="masterPickerPanel";
 picker.innerHTML=`<div class="masterPickerHead"><div><b>👥 Master Passenger List</b><span>Select passengers to add to this booking</span></div><button id="closeMasterPicker" type="button">×</button></div><div class="masterPickerList">${saved.map((x,i)=>`<label class="masterPickItem"><input type="checkbox" data-master-index="${i}"><span class="masterAvatar">${x.name.split(/\s+/).map(n=>n[0]).slice(0,2).join("").toUpperCase()}</span><span><b>${x.name}</b><small>${x.age} yrs • ${x.gender}</small></span></label>`).join("")}</div><button id="addSelectedMasters" type="button">ADD SELECTED PASSENGERS</button>`;
 document.querySelector(".passengerSectionHead").after(picker);
 document.getElementById("closeMasterPicker").onclick=()=>picker.remove();
 document.getElementById("addSelectedMasters").onclick=()=>{
   const indexes=[...picker.querySelectorAll("[data-master-index]:checked")].map(x=>+x.dataset.masterIndex);
   if(!indexes.length){alert("Select at least one passenger.");return}
   const current=document.querySelectorAll(".passengerRow.premium").length;
   if(current+indexes.length>6){alert(`You can add only ${6-current} more passenger(s). Maximum is 6.`);return}
   // Remove initial completely blank row before importing saved passengers.
   const rows=[...document.querySelectorAll(".passengerRow.premium")];
   if(rows.length===1&&!rows[0].children[0].value&&!rows[0].children[1].value)rows[0].remove();
   indexes.forEach(i=>addPremiumPassenger(saved[i]));
   updateMasterSummary();
   picker.remove();
 };
}
function updateMasterSummary(){
 const imported=[...document.querySelectorAll(".passengerRow.premium[data-master='true']")];
 const box=document.getElementById("selectedMasterSummary");
 if(!box)return;
 box.innerHTML=imported.length?`<div class="masterAddedNotice">✓ ${imported.length} passenger${imported.length>1?"s":""} added from Master Passenger List</div>`:"";
}

function addPremiumPassenger(prefill=null){const d=document.createElement("div");d.className="passengerRow premium";if(prefill)d.dataset.master="true";d.innerHTML='<input class="pName" placeholder="Passenger name *" maxlength="60"><input class="pAge" type="number" min="1" max="79" placeholder="Age *"><select><option>Male</option><option>Female</option><option>Other</option></select><select><option>No Preference</option><option>Lower</option><option>Middle</option><option>Upper</option><option>Side Lower</option><option>Side Upper</option></select><button class="danger">×</button>';if(prefill){d.children[0].value=prefill.name;d.children[1].value=prefill.age;d.children[2].value=prefill.gender}d.lastElementChild.onclick=()=>{d.remove();updateMasterSummary()};$("premiumPassengers").appendChild(d)}
function validPassengerName(name){return /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(name)&&/[A-Za-z]{2}/.test(name)}
function validIndianMobile(mobile){return /^[6-9]\d{9}$/.test(mobile)}
function validGmail(email){return /^[A-Za-z0-9](?:[A-Za-z0-9.]{0,28}[A-Za-z0-9])?@gmail\.com$/i.test(email)&&!email.split("@")[0].includes("..")}
function showValidationError(message,element){alert(message);element?.focus();element?.classList.add("invalid");setTimeout(()=>element?.classList.remove("invalid"),1800)}
function reviewPremium(t,cls,av){
 const rows=[...document.querySelectorAll(".passengerRow.premium")];
 if(!rows.length)return alert("Add at least one passenger.");
 const ps=[];
 for(let i=0;i<rows.length;i++){
   const row=rows[i],name=row.children[0].value.trim().replace(/\s+/g," "),ageText=row.children[1].value.trim(),age=Number(ageText);
   if(!name){showValidationError(`Passenger ${i+1}: Name is mandatory.`,row.children[0]);return}
   if(!validPassengerName(name)){showValidationError(`Passenger ${i+1}: Enter a valid name using letters and normal name punctuation only.`,row.children[0]);return}
   if(!ageText){showValidationError(`Passenger ${i+1}: Age is mandatory.`,row.children[1]);return}
   if(!Number.isInteger(age)||age<1||age>=80){showValidationError(`Passenger ${i+1}: Age must be a whole number from 1 to 79.`,row.children[1]);return}
   ps.push({name,age,gender:row.children[2].value,berth:row.children[3].value});
 }
 const mobile=$("mobile").value.trim(),email=$("email").value.trim().toLowerCase();
 if(!mobile){showValidationError("Mobile number is mandatory.",$("mobile"));return}
 if(!validIndianMobile(mobile)){showValidationError("Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.",$("mobile"));return}
 if(!email){showValidationError("Email address is mandatory.",$("email"));return}
 if(!validGmail(email)){showValidationError("Enter a valid Gmail address ending with @gmail.com.",$("email"));return}
 const base=av.fare*ps.length,insurance=$("insurance").checked?.45*ps.length:0,convenience=23.6,total=base+insurance+convenience;body.innerHTML=`<div class="bookingHero"><h2>Review Journey</h2><p>${t.name} • ${t.number}</p><p>${from.dataset.code} ${formatTime12(t.departure)} → ${to.dataset.code} ${formatTime12(t.arrival)}</p></div><div class="formSection"><h3>Passengers</h3>${ps.map((p,i)=>`<p><b>${i+1}. ${p.name}</b> • ${p.age} yrs • ${p.gender} • ${p.berth}</p>`).join("")}</div><div class="formSection fareSummary"><h3>Fare Summary</h3><div class="fareLine"><span>Ticket fare</span><b>₹${base.toFixed(2)}</b></div><div class="fareLine"><span>Travel insurance</span><b>₹${insurance.toFixed(2)}</b></div><div class="fareLine"><span>Convenience fee</span><b>₹${convenience.toFixed(2)}</b></div><div class="fareLine fareTotal"><span>Total</span><span>₹${total.toFixed(2)}</span></div></div><div class="notice">This payment and ticket are project simulations and do not create an IRCTC reservation.</div><div class="bookBar"><b>₹${total.toFixed(2)}</b><button id="finalPay">PAY WITH DEMO WALLET</button></div>`;$("finalPay").onclick=()=>completePremium(t,cls,av,ps,total)}
function completePremium(t,cls,av,ps,total){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 if(!session){alert("Please login before completing a booking.");return}
 if(balance<total)return alert("Insufficient demo wallet balance");
 balance-=total;localStorage.setItem("balance",balance);renderWalletBalance();
 const pnr=String(Math.floor(1e9+Math.random()*9e9));
 const confirmedPassengers=assignBerths(ps,cls);
 bookings.unshift({ownerEmail:session.email.toLowerCase(),pnr,train:t.name,number:t.number,from:from.dataset.code,to:to.dataset.code,date:$("date").value,departure:formatTime12(t.departure),arrival:formatTime12(t.arrival),cls,quota:$("quota").value,passengers:confirmedPassengers,mobile:$("mobile")?.value?.trim()||"",email:$("email")?.value?.trim()?.toLowerCase()||"",amount:+total.toFixed(2),status:"CNF",availabilityAtBooking:av.text,autoUpgrade:$("autoUpgrade")?.checked||false,insurance:true});
 save();modal.classList.remove("show");show("bookings");
 alert(`Booking confirmed! PNR ${pnr}. Coach and berth details are available in My Bookings.`);
}

function bookingForm(cls){body.innerHTML=`<h2>Passenger Details</h2><p>${currentTrain.name} • ${cls} • ${$("quota").value}</p><div id="passengers"></div><button id="addP">+ ADD PASSENGER</button><button id="pay">CONTINUE TO PAYMENT</button>`;addPassenger();$("addP").onclick=()=>{if(document.querySelectorAll(".passenger").length<6)addPassenger()};$("pay").onclick=()=>pay(cls)}
function addPassenger(){const d=document.createElement("div");d.className="passenger";d.innerHTML='<input placeholder="Passenger name"><input type="number" placeholder="Age"><select><option>Male</option><option>Female</option><option>Other</option></select><select><option>Lower</option><option>Middle</option><option>Upper</option><option>Side Lower</option></select>';$("passengers").appendChild(d)}
function pay(cls){const ps=[...document.querySelectorAll(".passenger")].map(x=>({name:x.children[0].value,age:x.children[1].value,gender:x.children[2].value,berth:x.children[3].value})).filter(x=>x.name);if(!ps.length)return alert("Add passenger name");
const amount=350*ps.length;if(balance<amount)return alert("Insufficient demo wallet balance");balance-=amount;localStorage.setItem("balance",balance);renderWalletBalance();
const pnr=String(Math.floor(1e9+Math.random()*9e9));bookings.unshift({pnr,train:currentTrain.name,number:currentTrain.number,from:from.dataset.code,to:to.dataset.code,date:$("date").value,cls,quota:$("quota").value,passengers:ps,amount,status:"PROJECT BOOKING"});save();modal.classList.remove("show");show("bookings")}
function save(){saveAccountBookings()}
function renderBookings(){
 bookings=loadAccountBookings();

function money2(value){return Number(value||0).toFixed(2)}
function renderWalletBalance(){
 const el=$("balance");if(el)el.textContent=money2(balance);
 const stat=$("statWallet");if(stat)stat.textContent=money2(balance);
}
function showWalletSuccess(amount){
 const box=$("walletSuccess");
 $("walletSuccessText").textContent=`Successfully ₹${money2(amount)} added to your wallet.`;
 box.classList.remove("show");void box.offsetWidth;box.classList.add("show");
 setTimeout(()=>box.classList.remove("show"),2200);
}

renderWalletBalance();
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 if(!session){$("bookingList").innerHTML='<div class="prettyEmpty"><span>🔐</span><h2>Login to see your journeys</h2><p>Your bookings are linked to your signed-in project account.</p></div>';return}
 $("bookingList").innerHTML=bookings.length?bookings.map((b,i)=>`<article class="journeyTicket"><div class="journeyTicketTop"><div><span class="featureTag" style="color:#087f5b">CONFIRMED JOURNEY</span><h2>${b.train}</h2><span class="muted">Train ${b.number} • ${b.date}</span></div><div><small>PNR</small><h3>${b.pnr}</h3></div></div><div class="journeyTicketRoute"><div><small>DEPARTURE</small><h2>${b.from}</h2><b>${b.departure||""}</b></div><div class="journeyArrow">━━━━ 🚆 ━━━━</div><div class="right"><small>ARRIVAL</small><h2>${b.to}</h2><b>${b.arrival||""}</b></div></div><div class="journeyMeta"><span class="metaPill">✓ ${b.status||"CNF"}</span><span class="metaPill">${b.cls}</span><span class="metaPill">${b.quota}</span><span class="metaPill">${b.passengers.length} Passenger${b.passengers.length>1?"s":""}</span><span class="metaPill">₹${b.amount}</span></div><div class="journeyPassengers"><b>Berth confirmation</b><p>${b.passengers.map(x=>`${x.name}: <strong class="available">${x.coach||b.cls} / ${x.seat||"-"} • CNF</strong>`).join(" &nbsp; | &nbsp; ")}</p></div><div class="journeyActions"><button class="danger" data-cancel="${i}">CANCEL PROJECT TICKET</button></div></article>`).join(""):'<div class="prettyEmpty"><span>🧳</span><h2>No journeys yet</h2><p>Book your first project journey and it will appear here.</p></div>';
 document.querySelectorAll("[data-cancel]").forEach(x=>x.onclick=()=>{const i=+x.dataset.cancel;balance+=bookings[i].amount;bookings.splice(i,1);localStorage.setItem("balance",balance);renderWalletBalance();save();renderBookings();renderProfile()})
}
$("pnrBtn").onclick=()=>{
 const input=$("pnrNo").value.trim();
 if(!/^\d{10}$/.test(input)){$("pnrOut").innerHTML='<div class="prettyEmpty"><span>⚠️</span><h2>Enter a valid 10-digit PNR</h2><p>PNR must contain exactly ten digits.</p></div>';return}
 bookings=loadAccountBookings();

function money2(value){return Number(value||0).toFixed(2)}
function renderWalletBalance(){
 const el=$("balance");if(el)el.textContent=money2(balance);
 const stat=$("statWallet");if(stat)stat.textContent=money2(balance);
}
function showWalletSuccess(amount){
 const box=$("walletSuccess");
 $("walletSuccessText").textContent=`Successfully ₹${money2(amount)} added to your wallet.`;
 box.classList.remove("show");void box.offsetWidth;box.classList.add("show");
 setTimeout(()=>box.classList.remove("show"),2200);
}

renderWalletBalance();const b=bookings.find(x=>x.pnr===input);
 if(!b){$("pnrOut").innerHTML='<div class="prettyEmpty"><span>🔎</span><h2>PNR not found</h2><p>No matching project booking belongs to this signed-in account.</p></div>';return}
 $("pnrOut").innerHTML=`<div class="pnrTicket"><div class="pnrTicketHead"><div><small>PROJECT PNR</small><h2>${b.pnr}</h2></div><div><small>CURRENT STATUS</small><h2>✓ ${b.status||"CNF"}</h2></div></div><div class="pnrTicketBody"><h2>${b.train}</h2><div class="muted">Train ${b.number} • ${b.date} • ${b.cls} • ${b.quota}</div><div class="pnrJourney"><div><small>FROM</small><h2>${b.from}</h2><b>${b.departure||""}</b></div><div>━━━━ 🚆 ━━━━</div><div class="right"><small>TO</small><h2>${b.to}</h2><b>${b.arrival||""}</b></div></div><h3>Passenger & Berth Confirmation</h3><div class="pnrPassengers">${b.passengers.map((x,i)=>`<div class="pnrPassenger"><small>PASSENGER ${i+1}</small><h3>${x.name}</h3><div>${x.age} yrs • ${x.gender}</div><p class="available"><b>CNF • ${x.coach||b.cls} / Seat ${x.seat||i+1}</b></p><span class="muted">${x.berthConfirmed||x.berth||"Confirmed Berth"}</span></div>`).join("")}</div></div></div>`;
};
$("scheduleBtn").onclick=async()=>{
 const no=$("trainNo").value.trim();
 if(!/^\d{4,6}$/.test(no)){ $("scheduleOut").innerHTML='<div class="scheduleEmpty"><div class="emptyRail">⚠️</div><h2>Enter a valid train number</h2><p>Use 4 to 6 digits.</p></div>';return}
 $("scheduleOut").innerHTML='<div class="scheduleEmpty"><div class="emptyRail">🚆</div><h2>Building the journey...</h2><p>Loading station sequence and timings.</p></div>';
 try{
  const rawRoute=await schedule(no,"");
  const isRealHalt=x=>{
    const a=String(x.arrival??"").trim().toLowerCase(),d=String(x.departure??"").trim().toLowerCase();
    const bad=v=>!v||["--","-","none","null","no halt","no_halt","pass","passing"].includes(v);
    return !(bad(a)&&bad(d));
  };
  const r=rawRoute.filter(isRealHalt);
  if(!r.length){$("scheduleOut").innerHTML='<div class="scheduleEmpty"><div class="emptyRail">🔎</div><h2>No route found</h2><p>This train number is not available in the local timetable dataset.</p></div>';return}
  const first=r[0],last=r[r.length-1],dur=durationBetween(first.departure||first.arrival,last.arrival||last.departure,first.day,last.day);
  $("scheduleOut").innerHTML=`<div class="routeSummary"><div><span class="muted">STARTS FROM</span><br><strong>${first.station_code}</strong><div>${first.station_name}</div></div><div class="routeDuration">━━━━ ${dur} ━━━━<br><small>${r.length} scheduled stops</small></div><div class="end"><span class="muted">TERMINATES AT</span><br><strong>${last.station_code}</strong><div>${last.station_name}</div></div></div><div class="routeTimeline">${r.map((x,i)=>`<div class="routeStop"><div class="routeDay">DAY ${x.day||1}</div><div class="routeRail"><div class="routeDot"></div></div><div class="stationInfo"><b>${x.station_code} — ${x.station_name}</b><span>${i===0?"Journey begins":i===r.length-1?"Final destination":`Stop ${i+1} of ${r.length}`}</span></div><div class="stopTimes"><div><small>ARRIVAL</small><b>${formatTime12(x.arrival)}</b></div><div><small>DEPARTURE</small><b>${formatTime12(x.departure)}</b></div></div></div>`).join("")}</div>`;
 }catch(e){$("scheduleOut").innerHTML=`<div class="scheduleEmpty"><div class="emptyRail">⚠️</div><h2>Could not load route</h2><p>${e.message}</p></div>`}
};
$("depositBtn").onclick=()=>{
 const amount=Number($("deposit").value);
 if(!Number.isFinite(amount)||amount<=0){alert("Enter a valid amount greater than ₹0.");$("deposit").focus();return}
 balance=Number((balance+amount).toFixed(2));
 localStorage.setItem("balance",String(balance));
 renderWalletBalance();$("deposit").value="";
 showWalletSuccess(amount);
};
$("close").onclick=()=>modal.classList.remove("show");renderBookings();

const track=document.getElementById("promoTrack");let promoIndex=0,promoTimer;
function promoStep(dir=1){if(!track)return;const cards=track.children.length;promoIndex=(promoIndex+dir+cards)%cards;const w=track.children[0].getBoundingClientRect().width+16;track.style.transform=`translateX(-${promoIndex*w}px)`}
document.getElementById("nextPromo")?.addEventListener("click",()=>promoStep(1));
document.getElementById("prevPromo")?.addEventListener("click",()=>promoStep(-1));
promoTimer=setInterval(()=>promoStep(1),4500);
track?.addEventListener("mouseenter",()=>clearInterval(promoTimer));
track?.addEventListener("mouseleave",()=>promoTimer=setInterval(()=>promoStep(1),4500));

window.addEventListener("railSessionChanged",()=>{bookings=loadAccountBookings();

function money2(value){return Number(value||0).toFixed(2)}
function renderWalletBalance(){
 const el=$("balance");if(el)el.textContent=money2(balance);
 const stat=$("statWallet");if(stat)stat.textContent=money2(balance);
}
function showWalletSuccess(amount){
 const box=$("walletSuccess");
 $("walletSuccessText").textContent=`Successfully ₹${money2(amount)} added to your wallet.`;
 box.classList.remove("show");void box.offsetWidth;box.classList.add("show");
 setTimeout(()=>box.classList.remove("show"),2200);
}

renderWalletBalance();if(document.getElementById("bookings").classList.contains("active"))renderBookings()});

function getCurrentUserRecord(){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 if(!session)return null;
 return JSON.parse(localStorage.getItem("railUsers")||"[]").find(u=>u.email===session.email)||null;
}
function renderProfile(){
 const u=getCurrentUserRecord(),guest=$("profileGuest"),content=$("profileContent");
 if(!u){guest.classList.remove("hidden");content.classList.add("hidden");return}
 guest.classList.add("hidden");content.classList.remove("hidden");
 const accountBookings=loadAccountBookings(),passengerCount=accountBookings.reduce((n,b)=>n+(b.passengers?.length||0),0);
 const initials=u.name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
 $("profileAvatar").textContent=initials;$("profileName").textContent=u.name;$("profileEmailHero").textContent=u.email;
 $("infoName").textContent=u.name;$("infoEmail").textContent=u.email;$("infoMobile").textContent=u.mobile;$("infoDob").textContent=u.dob;
 $("statTrips").textContent=accountBookings.length;$("statPassengers").textContent=passengerCount;$("statWallet").textContent=balance.toFixed(0);$("statMember").textContent=accountBookings.length>=5?"GOLD":accountBookings.length>=2?"SILVER":"NEW";
 const spent=accountBookings.reduce((n,b)=>n+(Number(b.amount)||0),0),routes=new Set(accountBookings.map(b=>b.from+"-"+b.to)).size;
 $("journeyInsights").innerHTML=`<div class="insight"><strong>${routes}</strong><span class="muted">Unique routes explored</span></div><div class="insight"><strong>₹${spent.toFixed(0)}</strong><span class="muted">Project booking value</span></div><div class="insight"><strong>${accountBookings.filter(b=>b.status==="CNF").length}</strong><span class="muted">Confirmed project tickets</span></div>`;
}
$("profileLoginBtn")?.addEventListener("click",()=>$("authBtn").click());
document.querySelectorAll("[data-profile-action]").forEach(b=>b.onclick=()=>show(b.dataset.profileAction));
$("editProfileBtn")?.addEventListener("click",()=>{
 const u=getCurrentUserRecord();if(!u)return;
 body.innerHTML=`<div class="profileDialog"><h2>Edit Personal Information</h2><label>Full name *</label><input id="editName" value="${u.name}"><label>Mobile number *</label><input id="editMobile" maxlength="10" value="${u.mobile}"><label>Date of birth *</label><input id="editDob" type="date" value="${u.dob}"><div id="editProfileError" class="profileError"></div><button id="saveProfile">SAVE CHANGES</button></div>`;modal.classList.add("show");
 $("saveProfile").onclick=()=>{const name=$("editName").value.trim(),mobile=$("editMobile").value.trim(),dob=$("editDob").value;if(!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(name))return $("editProfileError").textContent="Enter a valid name.";if(!/^[6-9]\d{9}$/.test(mobile))return $("editProfileError").textContent="Enter a valid Indian mobile number.";if(!dob||new Date(dob)>=new Date())return $("editProfileError").textContent="Enter a valid past date of birth.";const users=JSON.parse(localStorage.getItem("railUsers")||"[]");if(users.some(x=>x.email!==u.email&&x.mobile===mobile))return $("editProfileError").textContent="Mobile number already belongs to another account.";const x=users.find(x=>x.email===u.email);x.name=name;x.mobile=mobile;x.dob=dob;localStorage.setItem("railUsers",JSON.stringify(users));localStorage.setItem("railSession",JSON.stringify({name,email:u.email}));$("user").textContent=name;modal.classList.remove("show");renderProfile()}
});
$("changePasswordBtn")?.addEventListener("click",()=>{
 body.innerHTML=`<div class="profileDialog"><h2>Change Password</h2><label>Current password *</label><input id="currentPw" type="password"><label>New password *</label><input id="newPw" type="password"><label>Confirm new password *</label><input id="confirmPw" type="password"><div class="muted">Use 8+ characters with uppercase, lowercase, number and special character.</div><div id="pwError" class="profileError"></div><button id="savePw">UPDATE PASSWORD</button></div>`;modal.classList.add("show");
 $("savePw").onclick=()=>{const u=getCurrentUserRecord(),old=$("currentPw").value,nw=$("newPw").value,cf=$("confirmPw").value;if(old!==u.password)return $("pwError").textContent="Current password is incorrect.";if(!(nw.length>=8&&/[A-Z]/.test(nw)&&/[a-z]/.test(nw)&&/\d/.test(nw)&&/[^A-Za-z0-9]/.test(nw)))return $("pwError").textContent="New password does not meet security requirements.";if(nw!==cf)return $("pwError").textContent="New passwords do not match.";if(nw===old)return $("pwError").textContent="New password must be different from current password.";const users=JSON.parse(localStorage.getItem("railUsers")||"[]"),x=users.find(x=>x.email===u.email);x.password=nw;localStorage.setItem("railUsers",JSON.stringify(users));modal.classList.remove("show");alert("Password updated successfully.")}
});
window.addEventListener("railSessionChanged",()=>setTimeout(renderProfile,0));
const originalShow=show;show=function(id){originalShow(id);if(id==="profile")renderProfile()};

function refreshUserDropdown(){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 if(!session)return;
 const u=getCurrentUserRecord();
 $("dropName").textContent=session.name||u?.name||"Passenger";
 $("dropEmail").textContent=session.email||"";
 $("miniAvatar").textContent=(session.name||"P").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
}
$("userMenuBtn")?.addEventListener("click",e=>{e.stopPropagation();const session=JSON.parse(localStorage.getItem("railSession")||"null");if(!session){$("authBtn").click();return}$("userDropdown").classList.toggle("show");refreshUserDropdown()});
document.addEventListener("click",e=>{if(!e.target.closest(".userMenuWrap"))$("userDropdown")?.classList.remove("show")});
$("viewProfileDrop")?.addEventListener("click",()=>{$("userDropdown").classList.remove("show");show("profile");renderProfile()});
document.querySelectorAll("[data-drop-view]").forEach(b=>b.onclick=()=>{$("userDropdown").classList.remove("show");show(b.dataset.dropView)});
$("logoutDrop")?.addEventListener("click",()=>{$("userDropdown").classList.remove("show");localStorage.removeItem("railSession");window.dispatchEvent(new Event("railSessionChanged"));$("user").textContent="Guest";$("miniAvatar").textContent="G";$("authBtn").textContent="LOGIN / SIGN UP"});
window.addEventListener("railSessionChanged",()=>setTimeout(refreshUserDropdown,0));
refreshUserDropdown();

document.querySelectorAll("[data-amount]").forEach(b=>b.addEventListener("click",()=>{$("deposit").value=b.dataset.amount}));

// Final wallet handler override ensures two-decimal display and success animation.
if($("depositBtn"))$("depositBtn").onclick=()=>{
 const amount=Number($("deposit").value);
 if(!Number.isFinite(amount)||amount<=0){alert("Enter a valid amount greater than ₹0.");$("deposit").focus();return}
 balance=Number((balance+amount).toFixed(2));
 localStorage.setItem("balance",String(balance));
 renderWalletBalance();$("deposit").value="";
 showWalletSuccess(amount);
};

const serviceContent={
 current:["⚡","Current Booking","Search trains from the Book Ticket page and use the current date for last-minute project booking exploration."],
 boarding:["📍","Boarding Point","Open My Bookings to review journey origin details. A real production integration would validate permitted boarding-point changes against railway rules and booking status."],
 charts:["📋","Reservation Chart","Your project bookings show CNF status, coach and berth information for every passenger. Open My Bookings for the account-specific chart summary."],
 refund:["↩️","Refund History","Cancelled project tickets return their simulated booking amount to the demo wallet. This feature does not represent real railway refund processing."],
 alerts:["🔔","Journey Alerts","Enable project reminder preferences for departure time, booking date and journey day. Browser notification delivery would require notification permission."],
 food:["🍱","Food on Journey","A project meal-preference feature can be associated with a booked journey. Real food ordering requires an authorized catering/e-catering service integration."]
};
document.querySelectorAll("[data-service]").forEach(btn=>btn.onclick=()=>{
 const [icon,title,text]=serviceContent[btn.dataset.service];
 body.innerHTML=`<div class="serviceModal"><div class="serviceModalHero">${icon}</div><span class="featureTag" style="color:#2563eb">JOURNEY SERVICE</span><h2>${title}</h2><p>${text}</p><div class="serviceList"><div class="serviceItem">✓ Account-aware project experience</div><div class="serviceItem">✓ Integrated with the railway reservation UI</div><div class="serviceItem">✓ Clearly separated from real railway transactions</div></div></div>`;
 modal.classList.add("show");
});
renderWalletBalance();

function accountStorageKey(name){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 return session?.email?`${name}:${session.email.toLowerCase()}`:null;
}
function readAccountData(name){
 const key=accountStorageKey(name);return key?JSON.parse(localStorage.getItem(key)||"[]"):[];
}
function writeAccountData(name,data){
 const key=accountStorageKey(name);if(key)localStorage.setItem(key,JSON.stringify(data));
}
function openAdvancedTool(type){
 const session=JSON.parse(localStorage.getItem("railSession")||"null");
 if(!session){alert("Please login to use account tools.");return}
 if(type==="favourites"){
  const items=readAccountData("railFavouriteRoutes");
  body.innerHTML=`<div class="profileDialog"><span class="featureTag" style="color:#7c3aed">QUICK SEARCH</span><h2>⭐ Favourite Routes</h2><p class="muted">Save station code pairs for faster future searches.</p><div class="toolForm"><input id="favFrom" maxlength="10" placeholder="From station code, e.g. VSKP"><input id="favTo" maxlength="10" placeholder="To station code, e.g. NDLS"><button id="saveFav">SAVE ROUTE</button></div><div id="favList">${items.map((x,i)=>`<div class="savedItem"><b>${x.from} → ${x.to}</b><button data-remove-fav="${i}" class="danger">REMOVE</button></div>`).join("")||'<p class="muted">No favourite routes saved yet.</p>'}</div></div>`;
  modal.classList.add("show");
  $("saveFav").onclick=()=>{const f=$("favFrom").value.trim().toUpperCase(),t=$("favTo").value.trim().toUpperCase();if(!f||!t||f===t)return alert("Enter two different station codes.");items.push({from:f,to:t});writeAccountData("railFavouriteRoutes",items);openAdvancedTool("favourites")};
  document.querySelectorAll("[data-remove-fav]").forEach(b=>b.onclick=()=>{items.splice(+b.dataset.removeFav,1);writeAccountData("railFavouriteRoutes",items);openAdvancedTool("favourites")});
 }
 if(type==="passengers"){
  const items=readAccountData("railMasterPassengers");
  body.innerHTML=`<div class="profileDialog"><span class="featureTag" style="color:#7c3aed">PASSENGER DIRECTORY</span><h2>👥 Master Passenger List</h2><div class="toolForm"><input id="mpName" placeholder="Passenger name"><input id="mpAge" type="number" min="1" max="79" placeholder="Age"><select id="mpGender"><option>Male</option><option>Female</option><option>Other</option></select><button id="saveMp">ADD PASSENGER</button></div><div>${items.map((x,i)=>`<div class="savedItem"><div><b>${x.name}</b><small class="muted"> • ${x.age} yrs • ${x.gender}</small></div><button data-remove-mp="${i}" class="danger">REMOVE</button></div>`).join("")||'<p class="muted">No saved passengers yet.</p>'}</div></div>`;
  modal.classList.add("show");
  $("saveMp").onclick=()=>{const name=$("mpName").value.trim(),age=Number($("mpAge").value),gender=$("mpGender").value;if(!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(name)||!Number.isInteger(age)||age<1||age>=80)return alert("Enter a valid name and age from 1 to 79.");items.push({name,age,gender});writeAccountData("railMasterPassengers",items);openAdvancedTool("passengers")};
  document.querySelectorAll("[data-remove-mp]").forEach(b=>b.onclick=()=>{items.splice(+b.dataset.removeMp,1);writeAccountData("railMasterPassengers",items);openAdvancedTool("passengers")});
 }
 if(type==="reminders"){
  const items=readAccountData("railJourneyReminders");
  body.innerHTML=`<div class="profileDialog"><span class="featureTag" style="color:#7c3aed">TRAVEL ASSISTANT</span><h2>🔔 Journey Reminders</h2><div class="toolForm"><input id="remTitle" placeholder="Reminder title"><input id="remDate" type="datetime-local"><button id="saveRem">SAVE REMINDER</button></div><div>${items.map((x,i)=>`<div class="savedItem"><div><b>${x.title}</b><small class="muted"> • ${new Date(x.when).toLocaleString()}</small></div><button data-remove-rem="${i}" class="danger">REMOVE</button></div>`).join("")||'<p class="muted">No reminders saved yet.</p>'}</div><p class="walletNotice">Reminders are stored in this browser. They are not server push notifications.</p></div>`;
  modal.classList.add("show");
  $("saveRem").onclick=()=>{const title=$("remTitle").value.trim(),when=$("remDate").value;if(!title||!when||new Date(when)<=new Date())return alert("Enter a title and future date/time.");items.push({title,when});writeAccountData("railJourneyReminders",items);openAdvancedTool("reminders")};
  document.querySelectorAll("[data-remove-rem]").forEach(b=>b.onclick=()=>{items.splice(+b.dataset.removeRem,1);writeAccountData("railJourneyReminders",items);openAdvancedTool("reminders")});
 }
 if(type==="analytics"){
  const bs=loadAccountBookings(),passengers=bs.reduce((n,b)=>n+(b.passengers?.length||0),0),routes=new Set(bs.map(b=>`${b.from}-${b.to}`)).size,spent=bs.reduce((n,b)=>n+(Number(b.amount)||0),0);
  body.innerHTML=`<div class="profileDialog"><span class="featureTag" style="color:#7c3aed">PERSONAL INSIGHTS</span><h2>📊 Travel Analytics</h2><div class="analyticsGrid"><div class="analyticsTile"><strong>${bs.length}</strong><span>Total project journeys</span></div><div class="analyticsTile"><strong>${passengers}</strong><span>Passengers booked</span></div><div class="analyticsTile"><strong>${routes}</strong><span>Unique routes</span></div><div class="analyticsTile"><strong>₹${money2(spent)}</strong><span>Total project booking value</span></div></div><p class="walletNotice">Analytics are calculated only from bookings linked to this signed-in project account.</p></div>`;
  modal.classList.add("show");
 }
}
document.querySelectorAll("[data-advanced]").forEach(b=>b.onclick=()=>openAdvancedTool(b.dataset.advanced));
renderWalletBalance();

function sfmins(v){const m=String(v||"").match(/^(\d{1,2}):(\d{2})/);return m?+m[1]*60 + +m[2]:9999}function sfdur(t){let x=((+t.toDay||1)-(+t.fromDay||1))*1440+sfmins(t.arrival)-sfmins(t.departure);while(x<0)x+=1440;return x}function applySuiteFilters(){let r=[...(window.originalRows||[])],st=$("filterStatus").value,so=$("sortTrains").value;if(st!=="ALL")r=r.filter(t=>["1A","2A","3A","SL","CC"].some(c=>demoAvailability(t.number,c).kind===st));if(so==="DURATION")r.sort((a,b)=>sfdur(a)-sfdur(b));if(so==="DEPARTURE")r.sort((a,b)=>sfmins(a.departure)-sfmins(b.departure));if(so==="FARE")r.sort((a,b)=>demoAvailability(a.number,"SL").fare-demoAvailability(b.number,"SL").fare);window.lastRows=r;window.visibleCount=10;renderTrainPage()}["filterStatus","sortTrains"].forEach(id=>$(id)?.addEventListener("change",applySuiteFilters));$("resetTrainFilters")?.addEventListener("click",()=>{$("filterStatus").value="ALL";$("sortTrains").value="DEFAULT";window.lastRows=[...(window.originalRows||[])];renderTrainPage()});function allSuiteBookings(){let a=[];for(let i=0;i<localStorage.length;i++){let k=localStorage.key(i);if(k?.startsWith("railBookings:"))try{a.push(...JSON.parse(localStorage.getItem(k)||"[]"))}catch{}}return a}function renderAdmin(){let u=JSON.parse(localStorage.getItem("railUsers")||"[]"),b=allSuiteBookings(),q=JSON.parse(localStorage.getItem("railSearchLog")||"[]"),v=b.reduce((n,x)=>n+(+x.amount||0),0);$("adminStats").innerHTML=[["Registered Users",u.length],["Project Bookings",b.length],["Train Searches",q.length],["Booking Value","₹"+money2(v)]].map(x=>`<div class="adminStat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");let c={};b.forEach(x=>{let k=x.from+" → "+x.to;c[k]=(c[k]||0)+1});$("adminRoutes").innerHTML=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map((x,i)=>`<div class="rankItem"><span>${i+1}</span><b>${x[0]}</b><span>${x[1]} trips</span></div>`).join("")||"<p>No data yet.</p>";$("adminRecent").innerHTML=b.slice(0,6).map(x=>`<div class="rankItem"><span>🚆</span><b>${x.train}</b><span>${x.status||"CNF"}</span></div>`).join("")||"<p>No data yet.</p>"}document.querySelectorAll("[data-demo]").forEach(b=>b.onclick=()=>{if(b.dataset.demo==="prefix")$("dsaDemoOut").innerHTML="<b>Input: Mum</b><p>Weighted prefix ranking promotes major Mumbai stations above weaker matches.</p>";if(b.dataset.demo==="queue")$("dsaDemoOut").innerHTML="<b>WL1 → WL2 → WL3 → WL4</b><p>When one berth is released, WL1 advances first: FIFO queue behaviour.</p>";if(b.dataset.demo==="graph")$("dsaDemoOut").innerHTML="<b>VSKP ─ BZA ─ SC ─ NDLS</b><p>Stations are vertices and connections are weighted edges. Dijkstra can minimize route cost.</p>"});const academicShow=show;show=function(id){academicShow(id);if(id==="profile")renderProfile();if(id==="admin")renderAdmin()};
const supportLauncher=document.getElementById("supportLauncher"),supportChat=document.getElementById("supportChat"),chatMessages=document.getElementById("chatMessages");function openSupport(){supportChat?.classList.add("show");document.getElementById("supportInput")?.focus()}supportLauncher?.addEventListener("click",openSupport);document.getElementById("openSupportStrip")?.addEventListener("click",openSupport);document.getElementById("closeSupport")?.addEventListener("click",()=>supportChat?.classList.remove("show"));const supportAnswers={booking:"Search your route, choose a train and class, select availability, then click Book Now. You can also add passengers from your Master Passenger List.",pnr:"Open PNR STATUS, enter the 10-digit project PNR, and select Check Status.",refund:"Open MY BOOKINGS and select the relevant booking to view the project cancellation and refund flow.",agent:"Contact GoByRail.com support at gobyrail@gmail.com."};function addChat(t,k){const d=document.createElement("div");d.className=k;d.textContent=t;chatMessages.appendChild(d);chatMessages.scrollTop=chatMessages.scrollHeight}function answerSupport(q){addChat(supportAnswers[q]||supportAnswers.agent,"botMsg")}document.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>{addChat(b.textContent,"userMsg");setTimeout(()=>answerSupport(b.dataset.q),250)}));function sendSupportMessage(){const i=document.getElementById("supportInput"),v=i.value.trim();if(!v)return;addChat(v,"userMsg");i.value="";const x=v.toLowerCase();setTimeout(()=>answerSupport(x.includes("pnr")?"pnr":x.includes("refund")||x.includes("cancel")?"refund":x.includes("book")||x.includes("ticket")?"booking":"agent"),300)}document.getElementById("sendSupport")?.addEventListener("click",sendSupportMessage);document.getElementById("supportInput")?.addEventListener("keydown",e=>{if(e.key==="Enter")sendSupportMessage()});
