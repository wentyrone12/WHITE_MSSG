function showForm(formId) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById(formId).classList.add('active');
}


document.addEventListener("keydown", function(e){
  if (
    e.key === "F12" ||
    (e.ctrlKey && e.shiftKey && e.key === "I") ||
    (e.ctrlKey && e.shiftKey && e.key === "J") ||
    (e.ctrlKey && e.key === "U")
  ) {
    e.preventDefault();
    alert("Inspect is disabled!");
  }
});

document.addEventListener("contextmenu", function(e){
  e.preventDefault();
});