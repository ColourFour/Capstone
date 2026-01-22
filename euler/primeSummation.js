//find sum of all primes below 2 million
let primes = [2];
let sum = 0;

for(let i = 3; i < 2000000; i += 2){
    let isPrime = true;

    for(let k = 0; k < primes.length; k++){
        let p = primes[k]
        if (p*p > i) break; //I added this line to avoid unnecssary looping
        if(i % p == 0) {
            isPrime = false;
            break; //before I used continue which loops back and takes way longer
        }
    }
    if (isPrime == true) primes.push(i);
}

    console.log(primes);

for (let j = 0; j < primes.length; j++){
    sum += primes[j]
}

console.log(sum)

//node primeSummation.js