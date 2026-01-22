/*
//number that is divisible by every number from 1 to 20.
let canidate = 20;
let x = false;

while(x == false){
    for(let i = 1; i <= 20; i++){
    if(canidate % i != 0){
        canidate += 20;
        console.log(`${canidate} failed at ${i}`)
        i = 1;
    }
    else x = true;
}

    console.log(`${canidate} is the winner`);
}
*/

const gcd = (a, b) => {
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
};

const lcm = (a, b) => (a / gcd(a, b)) * b;

let result = 1;
for (let i = 2; i <= 20; i++) {
  result = lcm(result, i);
}

console.log(result); 

//node smallestMultiple.js