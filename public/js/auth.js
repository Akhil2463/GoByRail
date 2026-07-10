(()=>{
const $=id=>document.getElementById(id),modal=$("authModal"),login=$("loginForm"),signup=$("signupForm");
const users=()=>JSON.parse(localStorage.getItem("railUsers")||"[]");
const saveUsers=x=>localStorage.setItem("railUsers",JSON.stringify(x));
const validName=x=>/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(x)&&/[A-Za-z]{2}/.test(x);
const validMobile=x=>/^[6-9]\d{9}$/.test(x);
const validGmail=x=>/^[A-Za-z0-9](?:[A-Za-z0-9.]{0,28}[A-Za-z0-9])?@gmail\.com$/i.test(x)&&!x.split("@")[0].includes("..");
const strongPassword=x=>x.length>=8&&/[A-Z]/.test(x)&&/[a-z]/.test(x)&&/\d/.test(x)&&/[^A-Za-z0-9]/.test(x);
function tab(which){const isLogin=which==="login";login.classList.toggle("hidden",!isLogin);signup.classList.toggle("hidden",isLogin);$("loginTab").classList.toggle("active",isLogin);$("signupTab").classList.toggle("active",!isLogin)}
$("authBtn").onclick=()=>modal.classList.add("show");$("authClose").onclick=()=>modal.classList.remove("show");$("loginTab").onclick=()=>tab("login");$("signupTab").onclick=()=>tab("signup");
signup.onsubmit=e=>{e.preventDefault();$("signupError").textContent="";
 const name=$("signupName").value.trim().replace(/\s+/g," "),email=$("signupEmail").value.trim().toLowerCase(),mobile=$("signupMobile").value.trim(),dob=$("signupDob").value,pw=$("signupPassword").value,confirm=$("signupConfirm").value;
 if(!name||!email||!mobile||!dob||!pw||!confirm){$("signupError").textContent="Every field is mandatory.";return}
 if(!validName(name)){ $("signupError").textContent="Enter a valid full name.";return}
 if(!validGmail(email)){ $("signupError").textContent="Enter a valid @gmail.com address.";return}
 if(!validMobile(mobile)){ $("signupError").textContent="Enter a valid 10-digit Indian mobile number starting with 6–9.";return}
 const birth=new Date(dob),today=new Date();if(Number.isNaN(birth.getTime())||birth>=today){$("signupError").textContent="Enter a valid past date of birth.";return}
 if(!strongPassword(pw)){ $("signupError").textContent="Password needs 8+ characters with uppercase, lowercase, number and special character.";return}
 if(pw!==confirm){$("signupError").textContent="Passwords do not match.";return}
 if(!$("signupTerms").checked){$("signupError").textContent="You must accept the terms.";return}
 const list=users();if(list.some(u=>u.email===email)){ $("signupError").textContent="An account with this email already exists.";return}
 if(list.some(u=>u.mobile===mobile)){ $("signupError").textContent="An account with this mobile number already exists.";return}
 // Academic local demo only: production systems must hash passwords server-side.
 list.push({name,email,mobile,dob,password:pw});saveUsers(list);localStorage.setItem("railSession",JSON.stringify({name,email}));setSession();modal.classList.remove("show");signup.reset();
};
login.onsubmit=e=>{e.preventDefault();$("loginError").textContent="";const email=$("loginEmail").value.trim().toLowerCase(),pw=$("loginPassword").value;
 if(!email||!pw){$("loginError").textContent="Email and password are mandatory.";return}
 if(!validGmail(email)){ $("loginError").textContent="Enter a valid Gmail address.";return}
 const u=users().find(x=>x.email===email&&x.password===pw);if(!u){$("loginError").textContent="Email or password is incorrect.";return}
 localStorage.setItem("railSession",JSON.stringify({name:u.name,email:u.email}));setSession();modal.classList.remove("show");login.reset();
};
function setSession(){window.dispatchEvent(new Event("railSessionChanged"));const x=JSON.parse(localStorage.getItem("railSession")||"null");$("user").textContent=x?x.name:"Guest";$("authBtn").textContent=x?"LOGOUT":"LOGIN / SIGN UP";$("authBtn").onclick=x?()=>{localStorage.removeItem("railSession");setSession()}:()=>modal.classList.add("show")}
setSession();
})();