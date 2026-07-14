const API="https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";
async function load(){
const b=document.getElementById("leaderboard");
try{
const r=await fetch(API+"?action=getLeaderboard",{cache:"no-store"});
const d=await r.json();
const total=d.totalWeeks||d.totalweeks||d.seasonWeeks||13;
b.className="";
b.innerHTML=(d.leaderboard||[]).map(m=>`<div class=row><div><div class=name>${m.name}</div><div class=id>${m.memberId}</div></div><div class=weeks><span class=badge>${m.weeks}/${total}</span></div><div class=points>${Number(m.points).toLocaleString()}</div></div>`).join("");
}catch(e){b.textContent="Unable to load leaderboard.";}}
load();
