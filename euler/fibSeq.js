//1000 digit fib number
let fibSeq = [1, 1];
let sum = 1;
const limit = 10n ** 1000n;  // 10^1000 as BigInt

while(fibSeq[1] < limit){
    sum += 1;
    let a = BigInt(fibSeq[0])
    let b = BigInt(fibSeq[1])
    let c = BigInt(a + b);
    fibSeq = [b, c]
} 

console.log(sum)
//node fibSeq.js