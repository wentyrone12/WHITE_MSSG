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


document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
});


document.addEventListener("keydown", function (e) {
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "U")
    ) {
        e.preventDefault();
    }
});

loadParticles();
