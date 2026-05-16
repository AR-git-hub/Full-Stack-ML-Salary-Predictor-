const modelStatus = document.getElementById("modelStatus");
const predictResult = document.getElementById("predictResult");
const csvResult = document.getElementById("csvResult");

document.getElementById("uploadModelBtn").addEventListener("click", async () => {
  const file = document.getElementById("modelFile").files[0];
  if (!file) {
    modelStatus.textContent = "Выберите .pkl файл";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/upload-model", { method: "POST", body: form });
  const data = await res.json();
  modelStatus.textContent =
    data.status === "ok" ? "Модель загружена" : `Ошибка: ${data.detail || "unknown"}`;
});

document.getElementById("predictForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const record = Object.fromEntries(form.entries());
  for (const key of Object.keys(record)) {
    record[key] = Number(record[key]);
  }
  const res = await fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ records: [record] }),
  });
  const data = await res.json();
  if (!res.ok) {
    predictResult.textContent = data.detail || JSON.stringify(data, null, 2);
    return;
  }
  predictResult.textContent = JSON.stringify(data, null, 2);
});

document.getElementById("predictCsvBtn").addEventListener("click", async () => {
  const file = document.getElementById("csvFile").files[0];
  if (!file) {
    csvResult.textContent = "Выберите CSV";
    return;
  }
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/predict-from-csv", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    csvResult.textContent = data.detail || JSON.stringify(data, null, 2);
    return;
  }
  csvResult.textContent = JSON.stringify(data, null, 2);
});
