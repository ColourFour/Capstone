//10001st prime
let primes = [2, 3, 5, 7, 13];
let k = 14;


while (primes.length < 10001){
  let isPrime = true;
  
  for(let i = 0; i < primes.length; i++){
    if(k % primes[i] == 0) {
      isPrime = false;
      continue
    }
    if(i +1 == primes.length && isPrime == true) primes.push(k)
  }
  k++
}

console.log(primes[primes.length-1]);

//node primeNumber.js