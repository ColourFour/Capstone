//how many circular primes below one million
let primes = [2];
let circlePrimes = [];

for(let i = 3; i < 1000000; i += 2){
    let isPrime = true;

    for(let k = 0; k < primes.length; k++){
        let p = primes[k]
        if (p*p > i) break; 
        if(i % p == 0) {
            isPrime = false;
            break; 
        }
    }
    if (isPrime == true) primes.push(i);
}

const primeSet = new Set(primes);

for(let k = 1; k < 1000000; k++){
    let tester = Array.from(String(k), Number);
    let isPrime = true;

for(let i = 0; i < tester.length; i++){
    let p = Number(tester.join(""));
    if(!primeSet.has(p)) {
        isPrime = false;
        break
    }
    
    tester.push(tester[0]);
    tester.shift();
}
    if (isPrime) circlePrimes.push(k)
}

console.log(circlePrimes.length);

//node circularPrimes.js
