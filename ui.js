function showForm(formId) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById(formId).classList.add('active');
}

document.addEventListener("contextmenu", function(e){
  e.preventDefault();
  alert("Right click is disabled!");
});