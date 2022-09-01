const $ = (s) => {
  const el = document.querySelector(s);
  if (el === null) {
    throw new Error(`${s} not found`);
  }
  return el;
};
const $$ = document.querySelectorAll.bind(document);

const api = "http://localhost:5000";

const currentPrompts = [];

$("#token").value = localStorage.getItem("token") || "";
$("#token").addEventListener(
  "input",
  (e) => localStorage.setItem("token", e.target.value),
);

$("#prompt_text").value = localStorage.getItem("prompt_text") || "";
$("#prompt_text").addEventListener(
  "input",
  (e) => localStorage.setItem("prompt_text", e.target.value),
);

$("#seed").value = localStorage.getItem("seed") || 1;
$("#seed").addEventListener(
  "input",
  (e) => localStorage.setItem("seed", e.target.value),
);

$("#author").value = localStorage.getItem("author") || "";
$("#author").addEventListener(
  "input",
  (e) => localStorage.setItem("author", e.target.value),
);

$("#iterations").value = localStorage.getItem("iterations") || 30;
$("#current_iterations").textContent = $("#iterations").value;
$("#iterations").addEventListener("input", (e) => {
  $("#current_iterations").textContent = e.target.value;
  localStorage.setItem("iterations", e.target.value);
});

$("#priority").value = localStorage.getItem("priority") || 50;
$("#current_priority").textContent = $("#priority").value;
$("#priority").addEventListener("input", (e) => {
  $("#current_priority").textContent = e.target.value;
  localStorage.setItem("priority", e.target.value);
});

$("#submit").addEventListener("click", async (e) => {
  if (!prompt_text || !seed || !author) {
    alert("Please provide all fields");
    return;
  }

  await fetch(`${api}/prompt?token=${$("#token").value}`, {
    method: "post",
    body: JSON.stringify({
      prompt_text: $("#prompt_text").value,
      seed: +$("#seed").value,
      iterations: +$("#iterations").value,
      author: $("#author").value,
      priority: +$("#priority").value,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  updatePrompts();
});

const updatePrompts = async () => {
  const res = await fetch(`${api}/prompts`);
  const prompts = await res.json();
  $("#current_prompts").innerHTML =
    "<thead><tr><th>Prompt</th><th>Iterations</th><th>Seed</th><th>Priority</th><th>Author</th>";
  prompts.forEach((prompt) => {
    const row = document.createElement("tr");
    const prompt_text_td = document.createElement("td");
    const prompt_text = document.createElement("a");
    const iterations = document.createElement("td");
    const seed = document.createElement("td");
    const priority = document.createElement("td");
    const author = document.createElement("td");
    const being_generated = document.createElement("td");
    const generated_percent = document.createElement("td");
    prompt_text_td.appendChild(prompt_text);
    row.appendChild(prompt_text_td);
    row.appendChild(iterations);
    row.appendChild(seed);
    row.appendChild(priority);
    row.appendChild(author);
    row.appendChild(being_generated);
    row.appendChild(generated_percent);

    prompt_text.textContent = prompt.prompt_text;
    prompt_text.href = window.search = `?id=${prompt.id}`;
    iterations.textContent = prompt.iterations;
    seed.textContent = prompt.seed;
    priority.textContent = prompt.priority;
    author.textContent = prompt.author;

    if (prompt.being_generated) {
      being_generated.innerHTML =
        `<svg width=20 height=20><use href="#progress"></svg>`;
      generated_percent.textContent = `${prompt.generated_percent}%`;
    }

    row.classList.add("prompt");

    if (prompt.generated) {
      row.classList.add("generated");
    }

    $("#current_prompts").appendChild(row);
  });
};

updatePrompts();
setInterval(updatePrompts, 1000 * 1);

// Image stuff

const id = new URLSearchParams(window.location.search).get("id");

if (id) {
  fetch(`${api}/prompt/${id}`)
    .then((res) => res.json())
    .then((json) => {
      $("#display_prompt").textContent = json.prompt_text;
      $("#display_iterations").textContent = json.iterations;
      $("#display_seed").textContent = json.seed;
      $("#display_author").textContent = json.author;
      if (json.generated) {
        $("#display_image").src = `${api}/images/${id}.png`;
      } else {
        $("#display_image").remove();
        $("#image_not_generated").style.display = "block";
      }
      $("#image").style.display = "block";
    });
}
