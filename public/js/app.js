const $ = id => document.getElementById(id);
let files = [], currentGrade = 6, selectedGrade = 6;
const grades = {6:"Năm đầu",7:"Tiếp nối",8:"Phát triển",9:"Về đích"};
const ext = n => (n.split(".").pop() || "FILE").toLowerCase();
const size = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
const date = s => { try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return ""; } };
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url, options={}) {
  let r;
  try {
    r = await fetch(url, options);
  } catch (err) {
    throw new Error("Không kết nối được máy chủ. Hãy kiểm tra Render có trạng thái Live và thử tải lại trang.");
  }
  const d = await r.json().catch(()=>({error:`Máy chủ trả về phản hồi không hợp lệ (HTTP ${r.status}).`}));
  if(!r.ok) throw new Error(d.error || `Yêu cầu thất bại (HTTP ${r.status}).`);
  return d;
}
function setGrade(grade) {
  selectedGrade = Number(grade);
  document.querySelectorAll(".grade-tab").forEach(b=>b.classList.toggle("active",Number(b.dataset.grade)===selectedGrade));
  $("currentTitle").innerHTML = `Lớp ${currentGrade} <span>·</span> ${esc(grades[currentGrade])}`;
  $("currentSub").textContent = selectedGrade===currentGrade ? "Đây là lớp hiện tại. Tài liệu sẽ được lưu trong thư viện của lớp này." : `Bạn đang xem kho tài liệu lớp ${selectedGrade}. Tài liệu của lớp này vẫn được giữ lại.`;
  $("currentPill").textContent = `ĐANG XEM LỚP ${selectedGrade}`;
  renderFiles();
}
function renderFiles() {
  const q=$("search").value.trim().toLocaleLowerCase("vi"), subject=$("subjectFilter").value;
  const list=files.filter(f=>Number(f.grade)===selectedGrade&&f.name.toLocaleLowerCase("vi").includes(q)&&(!subject||f.subject===subject));
  $("totalCount").textContent=files.length;
  if(!list.length) {
    $("fileList").innerHTML=`<div class="empty">Chưa có tài liệu${q||subject?" phù hợp":" cho lớp "+selectedGrade}.<br>Quản trị viên có thể thêm đề cương vào lớp này trong khu vực quản trị.</div>`;
    return;
  }
  $("fileList").innerHTML=list.map((f,i)=>{
    const e=ext(f.name), type=["pdf","doc","docx","ppt","pptx"].includes(e)?e:"";
    return `<article class="file-card" style="animation-delay:${Math.min(i,8)*40}ms">
      <div class="file-type ${type}">${esc(e.toUpperCase().slice(0,4))}</div>
      <div class="file-details"><div class="file-name">${esc(f.name)}</div>
      ${f.description?`<div class="file-desc">${esc(f.description)}</div>`:""}
      <div class="file-meta"><span class="subject-chip">${esc(f.subject||"Khác")}</span><span>${size(f.size)}</span><span>${date(f.uploadedAt)}</span><span>↓ ${Number(f.downloads)||0}</span></div>
      <a class="download-button" href="/api/download/${encodeURIComponent(f.id)}">↓ Tải tài liệu</a></div></article>`;
  }).join("");
}
function renderManage() {
  if(!files.length){$("manageList").innerHTML='<p class="empty">Chưa có tài liệu nào.</p>';return;}
  $("manageList").innerHTML=[...files].sort((a,b)=>new Date(b.uploadedAt)-new Date(a.uploadedAt)).map(f=>`<div class="manage-row">
    <div><strong>${esc(f.name)}</strong><small>Lớp ${f.grade} · ${esc(f.subject||"Khác")} · ${size(f.size)}</small></div>
    <select data-grade-id="${esc(f.id)}" aria-label="Chuyển lớp cho ${esc(f.name)}"><option value="6" ${Number(f.grade)===6?"selected":""}>Lớp 6</option><option value="7" ${Number(f.grade)===7?"selected":""}>Lớp 7</option><option value="8" ${Number(f.grade)===8?"selected":""}>Lớp 8</option><option value="9" ${Number(f.grade)===9?"selected":""}>Lớp 9</option></select>
    <button data-delete-id="${esc(f.id)}">Xóa</button>
  </div>`).join("");
  document.querySelectorAll("[data-grade-id]").forEach(s=>s.addEventListener("change",async()=>{
    try { await api(`/api/files/${encodeURIComponent(s.dataset.gradeId)}`,{method:"PATCH",headers:{"Content-Type":"application/json","x-upload-password":$("password").value},body:JSON.stringify({grade:Number(s.value)})}); await loadFiles(); setStatus("Đã chuyển tài liệu sang lớp mới."); }
    catch(e){setStatus(e.message);await loadFiles();}
  }));
  document.querySelectorAll("[data-delete-id]").forEach(b=>b.addEventListener("click",async()=>{
    const f=files.find(x=>x.id===b.dataset.deleteId);if(!confirm(`Xóa tài liệu "${f?.name||""}"? Thao tác này không thể hoàn tác.`))return;
    try{const d=await api(`/api/files/${encodeURIComponent(b.dataset.deleteId)}`,{method:"DELETE",headers:{"x-upload-password":$("password").value}});setStatus(d.message);await loadFiles();}
    catch(e){setStatus(e.message);}
  }));
}
async function loadFiles() {
  try {
    const d=await api("/api/files"); files=d.files||[];currentGrade=Number(d.currentGrade)||6;
    $("currentGradeSelect").value=String(currentGrade);
    if(!["6","7","8","9"].includes($("uploadGrade").value))$("uploadGrade").value=String(currentGrade);
    setGrade(selectedGrade);renderManage();
  } catch(e){$("fileList").innerHTML=`<div class="empty">${esc(e.message)}</div>`;}
}
function setStatus(s){$("adminStatus").textContent=s;}
document.querySelectorAll(".grade-tab").forEach(b=>b.addEventListener("click",()=>setGrade(b.dataset.grade)));
$("search").addEventListener("input",renderFiles);$("subjectFilter").addEventListener("change",renderFiles);
$("refresh").addEventListener("click",()=>{ $("refresh").animate([{transform:"rotate(0deg)"},{transform:"rotate(360deg)"}],{duration:400});loadFiles(); });
$("toggleAdmin").addEventListener("click",()=>{const open=$("adminPanel").classList.toggle("open");$("toggleAdmin").innerHTML=open?'Đóng khu vực quản trị <span>−</span>':'Mở khu vực quản trị <span>＋</span>';});
$("saveGrade").addEventListener("click",async()=>{
  try{const d=await api("/api/settings/grade",{method:"POST",headers:{"Content-Type":"application/json","x-upload-password":$("password").value},body:JSON.stringify({grade:Number($("currentGradeSelect").value)})});currentGrade=d.currentGrade;setStatus(d.message);setGrade(currentGrade);await loadFiles();}
  catch(e){setStatus(e.message);}
});
$("uploadButton").addEventListener("click",async()=>{
  const picked=$("filePicker").files;if(!$("password").value){setStatus("Hãy nhập mật khẩu quản trị.");return;}if(!picked.length){setStatus("Bạn chưa chọn file.");return;}
  const form=new FormData();for(const f of picked)form.append("files",f);
  form.append("grade",$("uploadGrade").value);form.append("subject",$("uploadSubject").value);form.append("description",$("description").value);
  $("uploadButton").disabled=true;setStatus("Đang tải tài liệu lên…");
  try{const d=await api("/api/upload",{method:"POST",headers:{"x-upload-password":$("password").value},body:form});setStatus(d.message);$("filePicker").value="";$("description").value="";selectedGrade=Number($("uploadGrade").value);await loadFiles();setGrade(selectedGrade);}
  catch(e){setStatus(e.message);}finally{$("uploadButton").disabled=false;}
});
const dz=$("dropZone");dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("drag");});dz.addEventListener("dragleave",()=>dz.classList.remove("drag"));dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("drag");if(e.dataTransfer?.files?.length)$("filePicker").files=e.dataTransfer.files;});
loadFiles();