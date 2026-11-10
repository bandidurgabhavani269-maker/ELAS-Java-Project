
// ELAS+ Java full-stack application. Data is stored by the Java backend.

let data = {employees:[],attendance:[],leaves:[],projects:[]};
let currentUser = null;
let authToken = null;
let saveQueue = Promise.resolve();

async function loadData(){
  const response = await fetch("/api/state", {headers:{"Authorization":`Bearer ${authToken}`}});
  if(!response.ok) throw new Error("Could not load application data.");
  data = await response.json();
  return data;
}
function saveData(){
  if(!authToken) return Promise.resolve();
  const token = authToken;
  const payload = JSON.stringify(data);
  saveQueue = saveQueue.then(async()=>{
    const response = await fetch("/api/state", {
      method:"PUT",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:payload
    });
    if(!response.ok) throw new Error("Could not save data to the Java server.");
  }).catch(error=>{console.error(error);toast("Save failed. Please check the Java server and try again.");});
  return saveQueue;
}

function escapeHTML(value){
  return String(value ?? "").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function today(){
  const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDate(value){
  if(!value)return "—";
  const d=new Date(value+"T00:00:00");
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString();
}
function daysBetween(from,to){
  return Math.round((new Date(to+"T00:00:00")-new Date(from+"T00:00:00"))/86400000)+1;
}
function getEmployee(id){return data.employees.find(e=>e.id===id);}
function toast(message){
  const box=document.getElementById("toast-container");
  const item=document.createElement("div");item.className="toast";item.textContent=message;box.appendChild(item);
  setTimeout(()=>item.remove(),3000);
}
function fillLogin(email,password){
  document.getElementById("login-email").value=email;
  document.getElementById("login-password").value=password;
}
document.getElementById("login-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const email=document.getElementById("login-email").value.trim().toLowerCase();
  const password=document.getElementById("login-password").value;
  const errorBox=document.getElementById("login-error");
  errorBox.textContent="Signing in...";
  try{
    const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const result=await response.json();
    if(!response.ok) throw new Error(result.message||"Incorrect email or password.");
    authToken=result.token;currentUser=result.user;
    await loadData();
    errorBox.textContent="";
    openDashboard(currentUser.role);
  }catch(error){authToken=null;currentUser=null;errorBox.textContent=error.message||"Unable to connect to the Java server.";}
});
function openDashboard(role){
  document.getElementById("auth-view").hidden=true;
  document.getElementById("admin-view").hidden=role!=="admin";
  document.getElementById("employee-view").hidden=role!=="employee";
  const top=document.getElementById("top-user");top.hidden=false;
  top.textContent=`${currentUser.name} · ${role==="admin"?"Admin":"Employee"}`;
  document.getElementById("login-error").textContent="";
  if(role==="admin")renderAdmin();else renderEmployee();
}
function logout(){
  if(authToken) fetch("/api/logout",{method:"POST",headers:{"Authorization":`Bearer ${authToken}`}}).catch(()=>{});
  authToken=null;data={employees:[],attendance:[],leaves:[],projects:[]};
  currentUser=null;
  document.getElementById("auth-view").hidden=false;
  document.getElementById("admin-view").hidden=true;
  document.getElementById("employee-view").hidden=true;
  document.getElementById("top-user").hidden=true;
  document.getElementById("login-password").value="";
}
function showAdminTab(name){
  ["employees","talents","projects","attendance","leaves","analytics"].forEach(tab=>{
    document.getElementById("admin-"+tab).hidden=tab!==name;
    document.querySelector(`[data-admin-tab="${tab}"]`).classList.toggle("active",tab===name);
  });
  if(name==="employees")renderEmployees();
  if(name==="talents")renderTalents();
  if(name==="projects")renderProjects();
  if(name==="attendance")renderAttendance();
  if(name==="leaves")renderLeaves();
  if(name==="analytics")renderAnalytics();
}
function showEmployeeTab(name){
  ["profile","attendance","leave","projects","reports"].forEach(tab=>{
    document.getElementById("employee-"+tab).hidden=tab!==name;
    document.querySelector(`[data-emp-tab="${tab}"]`).classList.toggle("active",tab===name);
  });
  renderEmployee();
}
function renderAdmin(){
  document.getElementById("stat-employees").textContent=data.employees.length;
  document.getElementById("stat-present").textContent=data.attendance.filter(a=>a.date===today()&&["Present","Work From Home"].includes(a.status)).length;
  document.getElementById("stat-pending").textContent=data.leaves.filter(l=>l.status==="Pending").length;
  document.getElementById("stat-projects").textContent=data.projects.length;
  renderEmployees();
}
function renderEmployees(){
  const q=(document.getElementById("employee-search")?.value||"").toLowerCase();
  const list=data.employees.filter(e=>[e.id,e.name,e.department,...e.skills,e.talent].join(" ").toLowerCase().includes(q));
  document.getElementById("employee-table").innerHTML=list.map(e=>`<tr><td>${escapeHTML(e.id)}</td><td><b>${escapeHTML(e.name)}</b><br>${escapeHTML(e.email)}</td><td>${escapeHTML(e.department)}</td><td>${e.skills.map(s=>`<span class="pill">${escapeHTML(s)}</span>`).join("")}</td><td>${escapeHTML(e.talent)}</td></tr>`).join("")||'<tr><td colspan="5" class="empty">No employees found.</td></tr>';
}
function renderTalents(){
  document.getElementById("talent-list").innerHTML=data.employees.map(e=>`<article class="talent-card">
    <h3>${escapeHTML(e.name)} <span class="muted">(${escapeHTML(e.id)})</span></h3>
    <p>${escapeHTML(e.department)} · ${escapeHTML(e.designation)}</p>
    <p><b>Qualification:</b> ${escapeHTML(e.qualification||"Not added")}</p>
    <p><b>Skills:</b> ${e.skills.map(s=>`<span class="pill">${escapeHTML(s)}</span>`).join("")}</p>
    <p><b>Unique talent:</b> ${escapeHTML(e.talent||"Not added")} · <b>Level:</b> ${escapeHTML(e.level||"Beginner")}</p>
    ${e.resumeData?`<a class="btn light" href="${e.resumeData}" download="${escapeHTML(e.resumeName||"resume.pdf")}">Download resume</a>`:'<span class="muted">Resume not uploaded</span>'}
  </article>`).join("");
}
document.getElementById("project-form").addEventListener("submit",event=>{
  event.preventDefault();
  const name=document.getElementById("project-name").value.trim();
  const skills=document.getElementById("project-skills").value.split(",").map(s=>s.trim()).filter(Boolean);
  const members=Number(document.getElementById("project-members").value);
  if(!name||!skills.length||members<1||members>10){toast("Enter valid project details.");return;}
  data.projects.push({id:Date.now().toString(),name,skills,members,assigned:[],progress:{}});
  saveData();event.target.reset();document.getElementById("project-members").value=3;renderAdmin();showAdminTab("projects");toast("Project created.");
});
function scoreEmployee(employee,required){
  if(!required.length)return 0;
  const have=employee.skills.map(s=>s.toLowerCase());
  const matches=required.filter(skill=>have.includes(skill.toLowerCase())).length;
  return Math.round(matches/required.length*100);
}
function getProjectProgress(project,employeeId){
  if(!project.progress)project.progress={};
  return project.progress[employeeId]||{percent:0,hours:0,updatedAt:""};
}
function getEmployeeProjectStats(employeeId){
  const assigned=data.projects.filter(project=>project.assigned.includes(employeeId));
  const records=assigned.map(project=>getProjectProgress(project,employeeId));
  const completed=records.filter(record=>Number(record.percent)>=100).length;
  const inProgress=records.filter(record=>Number(record.percent)>0&&Number(record.percent)<100).length;
  const average=records.length?Math.round(records.reduce((sum,record)=>sum+Number(record.percent||0),0)/records.length):0;
  const hours=records.reduce((sum,record)=>sum+Number(record.hours||0),0);
  return {assigned:assigned.length,completed,inProgress,average,hours};
}
function saveProjectProgress(projectId){
  if(!currentUser||currentUser.role==="admin")return;
  const project=data.projects.find(item=>item.id===projectId);
  if(!project||!project.assigned.includes(currentUser.id))return;
  const percent=Number(document.getElementById(`project-progress-${projectId}`).value);
  const hours=Number(document.getElementById(`project-hours-${projectId}`).value);
  if(!Number.isFinite(percent)||percent<0||percent>100||!Number.isFinite(hours)||hours<0){toast("Enter progress from 0–100 and valid total hours.");return;}
  if(!project.progress)project.progress={};
  project.progress[currentUser.id]={percent,hours,updatedAt:today()};
  saveData();renderEmployee();renderAdmin();toast("Project progress updated.");
}

function renderProjects(){
  const box=document.getElementById("project-list");
  if(!data.projects.length){box.innerHTML='<p class="empty">No projects created yet. Create a project above.</p>';return;}
  box.innerHTML=data.projects.map(project=>{
    const ranked=data.employees.map(e=>({...e,score:scoreEmployee(e,project.skills)})).sort((a,b)=>b.score-a.score);
    const rows=ranked.map(e=>`<div class="match-row"><span><b>${escapeHTML(e.name)}</b> · ${escapeHTML(e.id)}<br><span class="muted">${escapeHTML(e.skills.join(", "))}</span></span><span class="match-score">${e.score}% match</span><button class="btn small-btn light" onclick="assignEmployee('${project.id}','${e.id}')">${project.assigned.includes(e.id)?"Assigned":"Assign"}</button></div>`).join("");
    const assigned=project.assigned.map(id=>getEmployee(id)).filter(Boolean);
    const progressRows=assigned.map(employee=>{
      const progress=getProjectProgress(project,employee.id);
      return `<tr><td>${escapeHTML(employee.name)} (${escapeHTML(employee.id)})</td><td>${progress.percent}%</td><td>${progress.hours} hrs</td><td>${progress.percent>=100?"Completed":progress.percent>0?"In progress":"Not started"}</td></tr>`;
    }).join("");
    return `<article class="project-card"><h3>${escapeHTML(project.name)}</h3><p><b>Required skills:</b> ${project.skills.map(s=>`<span class="pill">${escapeHTML(s)}</span>`).join("")}</p><p><b>Team size:</b> ${project.members} · <b>Assigned:</b> ${assigned.length}</p><p><b>Selected team:</b> ${assigned.length?assigned.map(e=>escapeHTML(e.name)).join(", "):"Not assigned yet"}</p>${assigned.length?`<h4>Team progress</h4><div class="table-wrap"><table><thead><tr><th>Employee</th><th>Completed</th><th>Hours worked</th><th>Status</th></tr></thead><tbody>${progressRows}</tbody></table></div>`:""}<details><summary>View employee skill matches</summary>${rows}</details></article>`;
  }).join("");
}
function assignEmployee(projectId,employeeId){
  const project=data.projects.find(p=>p.id===projectId);
  if(!project)return;
  if(project.assigned.includes(employeeId)){toast("Employee is already assigned.");return;}
  if(project.assigned.length>=project.members){toast("The project team is already full.");return;}
  project.assigned.push(employeeId);saveData();renderProjects();renderAdmin();toast("Employee assigned to project.");
}
function renderAttendance(){
  const records=[...data.attendance].sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById("attendance-table").innerHTML=records.map(a=>{
    const e=getEmployee(a.employeeId);
    return `<tr><td>${escapeHTML(e?.name||"Unknown")}</td><td>${formatDate(a.date)}</td><td><span class="status ${a.status.toLowerCase().replaceAll(" ","-")}">${escapeHTML(a.status)}</span></td><td>${escapeHTML(a.time)}</td><td>${escapeHTML(a.remarks||"—")}</td></tr>`;
  }).join("")||'<tr><td colspan="5" class="empty">No attendance records yet.</td></tr>';
}
function renderLeaves(){
  document.getElementById("leave-table").innerHTML=[...data.leaves].reverse().map(l=>{
    const e=getEmployee(l.employeeId);
    const actions=l.status==="Pending"?`<button class="btn small-btn approve" onclick="reviewLeave('${l.id}','Approved')">Approve</button><button class="btn small-btn reject" onclick="reviewLeave('${l.id}','Rejected')">Reject</button>`:"Reviewed";
    return `<tr><td>${escapeHTML(e?.name||"Unknown")}</td><td>${escapeHTML(l.type)}</td><td>${formatDate(l.from)} – ${formatDate(l.to)}</td><td>${l.days}</td><td>${escapeHTML(l.reason)}</td><td><span class="status ${l.status.toLowerCase()}">${escapeHTML(l.status)}</span></td><td>${actions}</td></tr>`;
  }).join("")||'<tr><td colspan="7" class="empty">No leave requests yet.</td></tr>';
}
function reviewLeave(id,decision){
  const leave=data.leaves.find(l=>l.id===id);
  if(!leave||leave.status!=="Pending")return;
  if(decision==="Approved"){
    const employee=getEmployee(leave.employeeId);
    if(!employee||employee.leaveBalance<leave.days){toast("Employee does not have enough leave balance.");return;}
    employee.leaveBalance-=leave.days;leave.remarks="Approved by admin.";
  }else{
    const reason=prompt("Enter rejection reason (optional):","Please contact admin.");
    if(reason===null)return;leave.remarks=reason.trim();
  }
  leave.status=decision;saveData();renderAdmin();renderLeaves();toast(`Leave ${decision.toLowerCase()}.`);
}

// Reports & Analytics (admin only)
let analyticsCharts = {};

function getAnalyticsDateRange(){
  const from = document.getElementById("analytics-from").value;
  const to = document.getElementById("analytics-to").value;
  return {from, to};
}

function isWithinAnalyticsRange(date, from, to){
  if(from && date < from)return false;
  if(to && date > to)return false;
  return true;
}

function renderAnalytics(){
  if(!currentUser || currentUser.role !== "admin")return;

  const {from, to} = getAnalyticsDateRange();
  const attendance = data.attendance.filter(a=>isWithinAnalyticsRange(a.date, from, to));
  const leaves = data.leaves.filter(l=>
    (!from || l.to >= from) && (!to || l.from <= to)
  );

  const present = attendance.filter(a=>["Present","Work From Home"].includes(a.status)).length;
  const absent = attendance.filter(a=>a.status==="Absent").length;
  const onLeave = leaves.filter(l=>l.status==="Approved").length;

  document.getElementById("analytics-records").textContent=attendance.length;
  document.getElementById("analytics-present").textContent=present;
  document.getElementById("analytics-absent").textContent=absent;
  document.getElementById("analytics-leaves").textContent=leaves.length;

  const employeeRows=data.employees.map(e=>{
    const employeeAttendance=attendance.filter(a=>a.employeeId===e.id);
    const employeeLeaves=leaves.filter(l=>l.employeeId===e.id);
    const attended=employeeAttendance.filter(a=>["Present","Work From Home"].includes(a.status)).length;
    const absentCount=employeeAttendance.filter(a=>a.status==="Absent").length;
    const approved=employeeLeaves.filter(l=>l.status==="Approved").reduce((sum,l)=>sum+l.days,0);
    const pending=employeeLeaves.filter(l=>l.status==="Pending").length;
    const rejected=employeeLeaves.filter(l=>l.status==="Rejected").length;
    const percentage=employeeAttendance.length?Math.round(attended/employeeAttendance.length*100):0;
    const projectStats=getEmployeeProjectStats(e.id);
    return `<tr><td><b>${escapeHTML(e.name)}</b><br>${escapeHTML(e.id)}</td><td>${escapeHTML(e.department)}</td><td>${attended}</td><td>${absentCount}</td><td>${approved}</td><td>${pending}</td><td>${rejected}</td><td>${percentage}%</td><td>${projectStats.assigned}</td><td>${projectStats.completed}</td><td>${projectStats.inProgress}</td><td>${projectStats.average}%</td><td>${projectStats.hours} hrs</td></tr>`;
  }).join("");
  document.getElementById("all-employee-report-table").innerHTML=employeeRows||'<tr><td colspan="13" class="empty">No employee reports available.</td></tr>';

  const leaveCounts = ["Approved","Pending","Rejected"].map(status=>
    leaves.filter(l=>l.status===status).length
  );

  const monthMap = {};
  attendance.forEach(a=>{
    const month=a.date.slice(0,7);
    if(!monthMap[month])monthMap[month]={present:0,total:0};
    monthMap[month].total++;
    if(["Present","Work From Home"].includes(a.status))monthMap[month].present++;
  });
  const months=Object.keys(monthMap).sort();
  const monthlyValues=months.map(month=>
    Math.round(monthMap[month].present/monthMap[month].total*100)
  );

  const departments=[...new Set(data.employees.map(e=>e.department))].sort();
  const departmentValues=departments.map(department=>{
    const employeeIds=data.employees.filter(e=>e.department===department).map(e=>e.id);
    const records=attendance.filter(a=>employeeIds.includes(a.employeeId));
    if(!records.length)return 0;
    const attended=records.filter(a=>["Present","Work From Home"].includes(a.status)).length;
    return Math.round(attended/records.length*100);
  });

  if(typeof Chart==="undefined"){
    document.querySelectorAll(".chart-card").forEach(card=>{
      card.insertAdjacentHTML("beforeend",'<p class="muted">Chart library could not load. Check your internet connection.</p>');
    });
    return;
  }

  Object.values(analyticsCharts).forEach(chart=>chart.destroy());
  analyticsCharts={};

  analyticsCharts.attendance=new Chart(document.getElementById("attendance-chart"),{
    type:"doughnut",
    data:{labels:["Present / WFH","Absent"],datasets:[{data:[present,absent],backgroundColor:["#16845b","#dc5454"]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}
  });

  analyticsCharts.leave=new Chart(document.getElementById("leave-chart"),{
    type:"bar",
    data:{labels:["Approved","Pending","Rejected"],datasets:[{label:"Leave requests",data:leaveCounts,backgroundColor:["#16845b","#e6a23c","#dc5454"]}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}},plugins:{legend:{display:false}}}
  });

  analyticsCharts.monthly=new Chart(document.getElementById("monthly-chart"),{
    type:"line",
    data:{labels:months.length?months:["No data"],datasets:[{label:"Attendance %",data:months.length?monthlyValues:[0],borderColor:"#4059d6",backgroundColor:"#4059d622",fill:true,tension:.3}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,max:100,ticks:{callback:value=>value+"%"}}}}
  });

  analyticsCharts.department=new Chart(document.getElementById("department-chart"),{
    type:"bar",
    data:{labels:departments.length?departments:["No data"],datasets:[{label:"Attendance %",data:departments.length?departmentValues:[0],backgroundColor:"#6d5ce7"}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",scales:{x:{beginAtZero:true,max:100,ticks:{callback:value=>value+"%"}}},plugins:{legend:{display:false}}}
  });
}

function downloadAnalyticsCSV(){
  if(!currentUser || currentUser.role !== "admin")return;
  const {from,to}=getAnalyticsDateRange();
  const attendance=data.attendance.filter(a=>isWithinAnalyticsRange(a.date,from,to));
  const leaves=data.leaves.filter(l=>(!from||l.to>=from)&&(!to||l.from<=to));
  const rows=[["Report Type","Employee ID","Employee Name","Date / Period","Status","Details"]];
  attendance.forEach(a=>{
    const e=getEmployee(a.employeeId);
    rows.push(["Attendance",a.employeeId,e?.name||"Unknown",a.date,a.status,a.remarks||""]);
  });
  leaves.forEach(l=>{
    const e=getEmployee(l.employeeId);
    rows.push(["Leave",l.employeeId,e?.name||"Unknown",`${l.from} to ${l.to}`,l.status,`${l.type} (${l.days} days): ${l.reason}`]);
  });
  data.projects.forEach(project=>project.assigned.forEach(employeeId=>{
    const e=getEmployee(employeeId);
    const progress=getProjectProgress(project,employeeId);
    rows.push(["Project Progress",employeeId,e?.name||"Unknown",project.name,progress.percent>=100?"Completed":progress.percent>0?"In progress":"Not started",`${progress.percent}% complete; ${progress.hours} hours worked`]);
  }));
  const csv=rows.map(row=>row.map(value=>`"${String(value??"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download="ELAS-Reports-Analytics.csv";link.click();
  URL.revokeObjectURL(url);
}


// Private employee report: only the currently signed-in employee's records are used.
let myReportCharts = {};

function renderMyReports(){
  if(!currentUser || currentUser.role==="admin")return;
  const employee=getEmployee(currentUser.id);
  if(!employee)return;

  const attendance=data.attendance.filter(a=>a.employeeId===employee.id);
  const leaves=data.leaves.filter(l=>l.employeeId===employee.id);
  const present=attendance.filter(a=>["Present","Work From Home"].includes(a.status)).length;
  const absent=attendance.filter(a=>a.status==="Absent").length;
  const percentage=attendance.length?Math.round(present/attendance.length*100):0;
  const approvedDays=leaves.filter(l=>l.status==="Approved").reduce((sum,l)=>sum+l.days,0);

  document.getElementById("my-report-present").textContent=present;
  document.getElementById("my-report-absent").textContent=absent;
  document.getElementById("my-report-percentage").textContent=percentage+"%";
  document.getElementById("my-report-leave-days").textContent=approvedDays;
  const projectStats=getEmployeeProjectStats(employee.id);
  document.getElementById("my-report-projects").textContent=projectStats.assigned;
  document.getElementById("my-report-completed").textContent=projectStats.completed;
  document.getElementById("my-report-project-average").textContent=projectStats.average+"%";
  document.getElementById("my-report-hours").textContent=projectStats.hours;
  const myProjects=data.projects.filter(project=>project.assigned.includes(employee.id));
  document.getElementById("my-report-project-table").innerHTML=myProjects.map(project=>{
    const progress=getProjectProgress(project,employee.id);
    const status=progress.percent>=100?"Completed":progress.percent>0?"In progress":"Not started";
    return `<tr><td>${escapeHTML(project.name)}</td><td>${progress.percent}%</td><td>${progress.hours} hrs</td><td>${status}</td><td>${progress.updatedAt?formatDate(progress.updatedAt):"—"}</td></tr>`;
  }).join("")||'<tr><td colspan="5" class="empty">No project contributions yet.</td></tr>';

  document.getElementById("my-report-attendance-table").innerHTML=attendance.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(a=>
    `<tr><td>${formatDate(a.date)}</td><td>${escapeHTML(a.status)}</td><td>${escapeHTML(a.time)}</td><td>${escapeHTML(a.remarks||"—")}</td></tr>`
  ).join("")||'<tr><td colspan="4" class="empty">No attendance records yet.</td></tr>';

  document.getElementById("my-report-leave-table").innerHTML=leaves.slice().reverse().map(l=>
    `<tr><td>${escapeHTML(l.type)}</td><td>${formatDate(l.from)}</td><td>${formatDate(l.to)}</td><td>${l.days}</td><td>${escapeHTML(l.status)}</td><td>${escapeHTML(l.remarks||"—")}</td></tr>`
  ).join("")||'<tr><td colspan="6" class="empty">No leave records yet.</td></tr>';

  if(typeof Chart==="undefined")return;
  Object.values(myReportCharts).forEach(chart=>chart.destroy());
  myReportCharts={};
  myReportCharts.attendance=new Chart(document.getElementById("my-attendance-chart"),{
    type:"doughnut",
    data:{labels:["Present / WFH","Absent"],datasets:[{data:[present,absent],backgroundColor:["#16845b","#dc5454"]}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}
  });
  myReportCharts.leave=new Chart(document.getElementById("my-leave-chart"),{
    type:"bar",
    data:{labels:["Approved","Pending","Rejected"],datasets:[{label:"My leave requests",data:["Approved","Pending","Rejected"].map(status=>leaves.filter(l=>l.status===status).length),backgroundColor:["#16845b","#e6a23c","#dc5454"]}]},
    options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true,ticks:{precision:0}}},plugins:{legend:{display:false}}}
  });
}

function renderEmployee(){
  if(!currentUser||currentUser.role==="admin")return;
  const e=getEmployee(currentUser.id);currentUser=e;
  document.getElementById("employee-welcome").textContent=`Hello, ${e.name}!`;
  document.getElementById("emp-balance").textContent=e.leaveBalance;
  const todayRecord=data.attendance.find(a=>a.employeeId===e.id&&a.date===today());
  document.getElementById("emp-status").textContent=todayRecord?todayRecord.status:"Not marked";
  document.getElementById("emp-project-count").textContent=data.projects.filter(p=>p.assigned.includes(e.id)).length;
  document.getElementById("my-profile").innerHTML=`<b>${escapeHTML(e.name)}</b> · ${escapeHTML(e.id)}<br>${escapeHTML(e.department)} · ${escapeHTML(e.designation)}<br><b>Current skills:</b> ${e.skills.map(s=>escapeHTML(s)).join(", ")||"Not added"}<br><b>Resume:</b> ${escapeHTML(e.resumeName||"Not uploaded")}`;
  document.getElementById("profile-qualification").value=e.qualification||"";
  document.getElementById("profile-skills").value=e.skills.join(", ");
  document.getElementById("profile-talent").value=e.talent||"";
  document.getElementById("profile-level").value=e.level||"Beginner";
  document.getElementById("attendance-date").value=today();
  document.getElementById("attendance-time").value=new Date().toTimeString().slice(0,5);
  document.getElementById("my-attendance-table").innerHTML=data.attendance.filter(a=>a.employeeId===e.id).slice().reverse().map(a=>`<tr><td>${formatDate(a.date)}</td><td>${escapeHTML(a.status)}</td><td>${escapeHTML(a.time)}</td><td>${escapeHTML(a.remarks||"—")}</td></tr>`).join("")||'<tr><td colspan="4" class="empty">No attendance yet.</td></tr>';
  document.getElementById("my-leave-table").innerHTML=data.leaves.filter(l=>l.employeeId===e.id).slice().reverse().map(l=>`<tr><td>${escapeHTML(l.type)}</td><td>${formatDate(l.from)}</td><td>${formatDate(l.to)}</td><td>${l.days}</td><td><span class="status ${l.status.toLowerCase()}">${escapeHTML(l.status)}</span></td><td>${escapeHTML(l.remarks||"—")}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">No leave requests yet.</td></tr>';
  const projects=data.projects.filter(p=>p.assigned.includes(e.id));
  document.getElementById("my-projects").innerHTML=projects.map(p=>{
    const progress=getProjectProgress(p,e.id);
    return `<article class="project-card"><h3>${escapeHTML(p.name)}</h3><p>Required skills: ${p.skills.map(s=>`<span class="pill">${escapeHTML(s)}</span>`).join("")}</p><p><b>Current progress:</b> ${progress.percent}% · <b>Total hours worked:</b> ${progress.hours} hrs</p><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0,Math.min(100,Number(progress.percent)||0))}%"></div></div><div class="form-grid project-progress-form"><div><label for="project-progress-${p.id}">Completion percentage</label><input id="project-progress-${p.id}" type="number" min="0" max="100" value="${progress.percent}" required></div><div><label for="project-hours-${p.id}">Total hours worked</label><input id="project-hours-${p.id}" type="number" min="0" step="0.5" value="${progress.hours}" required></div><div class="wide"><button class="btn primary" type="button" onclick="saveProjectProgress('${p.id}')">Update project progress</button></div></div><p class="muted">Last updated: ${progress.updatedAt?formatDate(progress.updatedAt):"Not updated yet"}</p></article>`;
  }).join("")||'<p class="empty">No projects assigned yet.</p>';
  if(!document.getElementById("employee-reports").hidden)renderMyReports();
}
document.getElementById("profile-form").addEventListener("submit",async event=>{
  event.preventDefault();
  const e=getEmployee(currentUser.id);
  e.qualification=document.getElementById("profile-qualification").value.trim();
  e.skills=document.getElementById("profile-skills").value.split(",").map(s=>s.trim()).filter(Boolean);
  e.talent=document.getElementById("profile-talent").value.trim();
  e.level=document.getElementById("profile-level").value;
  const file=document.getElementById("resume-file").files[0];
  if(file){
    if(file.type!=="application/pdf"&&!file.name.toLowerCase().endsWith(".pdf")){toast("Please upload a PDF file.");return;}
    if(file.size>2*1024*1024){toast("Resume must be 2 MB or smaller.");return;}
    const reader=new FileReader();
    reader.onload=()=>{
      e.resumeData=reader.result;e.resumeName=file.name;saveData();renderEmployee();renderTalents();
      document.getElementById("resume-status").textContent="Resume uploaded.";
      toast("Profile and resume saved.");
    };
    reader.onerror=()=>toast("Could not read the resume file.");
    reader.readAsDataURL(file);
  }else{
    saveData();renderEmployee();document.getElementById("resume-status").textContent="Profile saved.";
    toast("Profile saved.");
  }
});
document.getElementById("attendance-form").addEventListener("submit",event=>{
  event.preventDefault();const e=getEmployee(currentUser.id);
  const date=document.getElementById("attendance-date").value;
  const record={employeeId:e.id,date,status:document.getElementById("attendance-status").value,time:document.getElementById("attendance-time").value,remarks:document.getElementById("attendance-remarks").value.trim()};
  const existing=data.attendance.find(a=>a.employeeId===e.id&&a.date===date);
  if(existing)Object.assign(existing,record);else data.attendance.push(record);
  saveData();renderEmployee();renderAdmin();toast("Attendance saved.");
});
document.getElementById("leave-form").addEventListener("submit",event=>{
  event.preventDefault();const e=getEmployee(currentUser.id);
  const from=document.getElementById("leave-from").value,to=document.getElementById("leave-to").value;
  if(to<from){toast("End date cannot be earlier than start date.");return;}
  const days=daysBetween(from,to);
  if(days>e.leaveBalance){toast("Not enough leave balance.");return;}
  data.leaves.push({id:Date.now().toString(),employeeId:e.id,type:document.getElementById("leave-type").value,from,to,days,reason:document.getElementById("leave-reason").value.trim(),status:"Pending",remarks:""});
  saveData();event.target.reset();renderEmployee();renderAdmin();toast("Leave request submitted.");
});
document.getElementById("leave-from").addEventListener("change",()=>{
  document.getElementById("leave-to").min=document.getElementById("leave-from").value;
});
document.getElementById("attendance-date").value=today();
document.getElementById("attendance-time").value=new Date().toTimeString().slice(0,5);
