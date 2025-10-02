// Function definitions
function f(x) {
  return Math.pow(x, 3) + x - 1;
}
function fPrime(x) {
  return 3 * x * x + 1;
}
function N(x) {
  return x - f(x) / fPrime(x); // Newton iteration
}
function g(x) {
  return 1 - Math.pow(x, 3);   // Fixed-point iteration form
}

// Globals for charts
let iterChart, cobwebChart;

function runIteration() {
  const x0 = parseFloat(document.getElementById("x0").value);
  const K = parseInt(document.getElementById("steps").value);

  // Generate iterates
  let newton = [x0];
  let fixed = [x0];
  for (let i = 1; i <= K; i++) {
    newton.push(N(newton[i - 1]));
    fixed.push(g(fixed[i - 1]));
  }

  // === Iteration vs Step ===
  const labels = Array.from({ length: K + 1 }, (_, i) => i);

  const iterData = {
    labels: labels,
    datasets: [
      {
        label: "Newton",
        data: newton,
        borderColor: "blue",
        backgroundColor: "blue",
        tension: 0.2
      },
      {
        label: "Fixed-Point",
        data: fixed,
        borderColor: "red",
        backgroundColor: "red",
        tension: 0.2
      }
    ]
  };

  if (iterChart) iterChart.destroy();
  iterChart = new Chart(document.getElementById("iterChart"), {
    type: "line",
    data: iterData,
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { title: { display: true, text: "Step" } },
        y: { title: { display: true, text: "xₙ" } }
      }
    }
  });

  // === Cobweb Diagram ===
  const cobLabels = [];
  const cobPoints = [];

  // y = x line
  for (let x = -2; x <= 2; x += 0.1) {
    cobLabels.push(x);
  }

  const gCurve = cobLabels.map(x => g(x));

  // Cobweb segments for fixed-point iteration
  let cobSegments = [];
  for (let i = 0; i < K; i++) {
    let x_n = fixed[i];
    let x_next = fixed[i + 1];
    // Vertical step
    cobSegments.push({ x: [x_n, x_n], y: [x_n, x_next] });
    // Horizontal step
    cobSegments.push({ x: [x_n, x_next], y: [x_next, x_next] });
  }

  const cobData = {
    labels: cobLabels,
    datasets: [
      {
        label: "y = g(x)",
        data: gCurve,
        borderColor: "red",
        showLine: true,
        pointRadius: 0
      },
      {
        label: "y = x",
        data: cobLabels,
        borderColor: "gray",
        showLine: true,
        pointRadius: 0
      },
      ...cobSegments.map((seg, idx) => ({
        label: idx === 0 ? "Cobweb" : "",
        data: seg.x.map((x, j) => ({ x, y: seg.y[j] })),
        borderColor: "blue",
        showLine: true,
        pointRadius: 0
      }))
    ]
  };

  if (cobwebChart) cobwebChart.destroy();
  cobwebChart = new Chart(document.getElementById("cobwebChart"), {
    type: "scatter",
    data: cobData,
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: {
        x: { min: -2, max: 2, title: { display: true, text: "x" } },
        y: { min: -2, max: 2, title: { display: true, text: "y" } }
      }
    }
  });
}

// Run once at load
window.onload = runIteration;