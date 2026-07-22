if (
    localStorage.getItem(
        "welfareLoggedIn"
    ) === "true"
){

    document.getElementById(
        "loginOverlay"
    ).style.display = "none";

    document.getElementById(
        "dashboardContent"
    ).style.display = "block";
}

const welfareCSV='https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=439044630&single=true&output=csv';
const contributionsCSV =
'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1555365618&single=true&output=csv';

const expensesCSV =
'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=493023062&single=true&output=csv';

async function load(){

  try{

    let rows = [];

    try{
      rows = (await (await fetch(welfareCSV))
        .text())
        .trim()
        .split('\n')
        .map(r => r.split(','));
    }catch(err){
      console.error("CSV Load Failed:", err);
    }

    totalContributions.innerText =
      '₦' + Number(rows[0]?.[1] || 0).toLocaleString();

    totalExpenses.innerText =
      '₦' + Number(rows[1]?.[1] || 0).toLocaleString();

    currentBalance.innerText =
      '₦' + Number(rows[2]?.[1] || 0).toLocaleString();

   const contributionRows =
  (await (await fetch(contributionsCSV)).text())
  .trim()
  .split("\n")
  .slice(1)
  .map(r => r.split(","));

const expenseRows =
  (await (await fetch(expensesCSV)).text())
  .trim()
  .split("\n")
  .slice(1)
  .map(r => r.split(","));

const transactions = [];


/* CONTRIBUTIONS */

contributionRows.forEach(row => {

    transactions.push({

        date: row[1] || "",

        amount: Number(row[3] || 0),

        title: row[5] || "Contribution",

        type: "credit"

    });

});


/* EXPENSES */

expenseRows.forEach(row => {

    transactions.push({

        date: row[1] || "",

        amount: Number(row[2] || 0),

        title: row[3] || "Expense",

        type: "debit"

    });

});


transactions.sort((a, b) => {

    return new Date(b.date) - new Date(a.date);

});


activityTable.innerHTML = "";

transactions.slice(0, 10).forEach(item => {

    activityTable.innerHTML += `

    <tr>

        <td>

            <strong>${item.title}</strong>

            <br>

            <small>

                ${item.type === "credit"
                    ? "Contribution"
                    : "Expense"}

            </small>

        </td>

        <td class="${item.type}">

            ${item.type === "credit" ? "+" : "-"}

            ₦${item.amount.toLocaleString()}

        </td>

    </tr>

    `;

});

    const c = document.getElementById('financeChart');

    if(window.fc) window.fc.destroy();

    window.fc = new Chart(c,{
      type:'bar',
      data:{
        labels:['Contributions','Expenses','Balance'],
        datasets:[{
          data:[
            Number(rows[0]?.[1]||0),
            Number(rows[1]?.[1]||0),
            Number(rows[2]?.[1]||0)
          ]
        }]
      },
      options:{
        plugins:{
          legend:{display:false}
        },
        responsive:true
      }
    });

  }catch(e){

    console.error(e);

  }

}


load();
setInterval(load,30000);

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";
  
let attempts = 0;


document
.getElementById("loginBtn")
.addEventListener(
"click",
loginUser
);

async function loginUser(){

const username =
document.getElementById(
"username"
).value.trim();

const password =
document.getElementById(
"password"
).value.trim();

const error =
document.getElementById(
"loginError"
);

error.innerText="";

if(!username || !password){

error.innerText =
"Enter username and password";

return;

}

document.getElementById(
"loginBtn"
).innerText =
"Checking...";

try{

const response =
await fetch(
SCRIPT_URL,
{
method:"POST",
body:JSON.stringify({
    action:"login",
    username,
    password
})
}
);

const result =
await response.json();

if(result.success){

localStorage.setItem(
    "welfareLoggedIn",
    "true"
);

localStorage.setItem(
    "username",
    result.user
);
  
document.getElementById(
"loginOverlay"
).style.display="none";

document.getElementById(
"dashboardContent"
).style.display="block";

}else{

attempts++;

error.innerText =
"Invalid Login Details";

if(attempts >= 3){

error.innerText =
"Access Denied. Redirecting...";

setTimeout(()=>{

window.location.href =
"index.html";

},3000);

}

}

}catch(err){

error.innerText =
"Connection Error";

}

document.getElementById(
"loginBtn"
).innerText =
"Login";

}


const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", function(){

    // remove saved login session
   localStorage.removeItem(
    "welfareLoggedIn"
);

localStorage.removeItem(
    "username"
);
  
    // hide dashboard
    document.getElementById(
        "dashboardContent"
    ).style.display = "none";


    // show login screen again
    document.getElementById(
        "loginOverlay"
    ).style.display = "flex";


    // clear inputs
    document.getElementById(
        "username"
    ).value = "";

    document.getElementById(
        "password"
    ).value = "";


});
