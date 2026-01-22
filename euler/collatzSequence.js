//n is even...n = n/2
//n is odd...n = 3n + 1
//13 -> 40 -> 20 -> 10 -> 5 -> 16 -> 8 -> 4 -> 2 -> 1
//find longest chain to 1 for terms under one million
let max = 0;
let solution = 1;

for(let k = 1; k < 1000000; k++){
    let bob = [k];
    let i = 0;

    while(bob[i] != 1){

    if(bob[i] % 2 == 0){
        bob.push(bob[i]/2);
    }
    else bob.push(3*bob[i]+1);

    i += 1;   
    }
    
    if(bob.length > max) {max = bob.length;
    solution = k;}

}
console.log(solution)
//node collatzSequence.js

/*
// Project Euler 14 (recursive + memo)
const memo = new Map();
memo.set(1, 1); // chain length for 1 is 1 (includes the 1)

function collatzLen(n) {
  if (memo.has(n)) return memo.get(n);

  const next = (n % 2 === 0) ? (n / 2) : (3 * n + 1);
  const len = 1 + collatzLen(next);

  memo.set(n, len);
  return len;
}

let bestN = 1;
let bestLen = 1;

for (let n = 2; n < 1_000_000; n++) {
  const len = collatzLen(n);
  if (len > bestLen) {
    bestLen = len;
    bestN = n;
  }
}

console.log(bestN);

*/