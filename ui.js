function showForm(formId) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById(formId).classList.add('active');
}


function togglePassword(...ids) {

    ids.forEach(id => {

        const input = document.getElementById(id);

        if (!input) return;

        input.type =
            input.type === "password"
            ? "text"
            : "password";

    });

}