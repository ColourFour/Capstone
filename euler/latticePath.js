//2x2 grid => 6 routes to the bottom right corner
//how many routes for 20x20 grid -> only can move right and down

function factorial(n, solution = 1){
    if (n === 0) return solution;
    return factorial(n-1, solution * n);
}


let n = 20;
let m = 20;

console.log(factorial(n+m) / (factorial(n) * factorial(m)))
//node latticePath.js