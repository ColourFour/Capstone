//1000 digit fib number
let previousTerm = 2n;
let currentTerm = 1n;
let nextTerm = 1n;
let count = 0

while(nextTerm < 10n ** 999n){
    previousTerm = currentTerm;
    currentTerm = nextTerm;
    nextTerm = currentTerm + previousTerm;
    count += 1;
}

console.log(count);
console.log(nextTerm);

//node fibSeq.js