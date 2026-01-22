//largePrime = sumPrimes
let primes = [2];
let upperBound = 547;
let sum = 0;
let solution = null;

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

const PrimeSet = new Set(primes);

/*while(sum < 1000000){
    sum += primes[i];
    i += 1;
}

console.log(i); -> upper bound is 547 consec primes, 78,498 primes up to 1,000,000*/
for(let k = 0; k < primes.length; k++){
for(let i = 0; i < upperBound; i++){
    sum += primes[i + k];
    if(sum > primes[primes.length - 1]) break;
    if(PrimeSet.has(sum)) solution = sum;
}
    sum = 0;
    if(solution != null) k = primes.length;
}

console.log(solution);

//node consecPrime.js