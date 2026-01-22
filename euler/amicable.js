let sumArray = [];
let sum = 0;

function divisorSums(array){
    let sum = 0;
    for(let i = 0; i < array.length; i++){
        sum += array[i];
    }
    return sum;
}

function divisors(n){
    let properDivisors = [];
    for(let i = 1; i < n; i++){
        if(n % i == 0) properDivisors.push(i);
    }
    return properDivisors;
}

for(let i = 0; i < 10000; i++){
    sumArray.push(divisorSums(divisors(i)));
}

for(let i = 0; i < sumArray.length; i++){
    for(let j = 0; j < sumArray.length; j++){
    if(i != j && i == sumArray[j] && j == sumArray[i]) sum += sumArray[i]
    }
}

console.log(sum)