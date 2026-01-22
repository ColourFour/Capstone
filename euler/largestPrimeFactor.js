//What is the largest prime factor of the number 600851475143
//13195 prime factors are 5, 7, 13, 29
/*let number = 600851475143;
let prime = [];

for(let i = 2; i*i < number; i++){
    while(number % i == 0){
        number = number / i;
        if(prime[i] != i) prime.push(i);
        i -= 1;
    }
    prime.push(number)
}

console.log(prime[prime.length-1]);



//node largestPrimeFactor.js*/

let triangleNumber = [1];
let divisors = 0;
let pushTerm = 1;
let i = 2;

while(divisors < 500){
    pushTerm = i + pushTerm;
    triangleNumber.push(pushTerm);
    i += 1;
    let prog = [];

    for(let i = 1; i < pushTerm; i++){
        if(pushTerm % i == 0){
            divisors += 1;
        }
    }
    divisors = 0;
}

console.log(triangleNumber)