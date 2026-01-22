//sum of digits in 2^10000
/*let product = 2n;
let massive = 1n;

for(let i = 1; i < 100; i++){
    product *= 2n;
}

for(let i = 0; i < 10; i++){
    massive *= product;
}
console.log(massive)*/

/*let solutionAttempt = "10715086071862673209484250490600018105614048117055336074437503883703510511249361224931983788156958581275946729175531468251871452856923140435984577574698574803934567774824230985421074605062371141877954182153046474983581941267398767559165543946077062914571196477686542167660429831652624386837205668069376"
let solutionArr = solutionAttempt.split("");
let sum = 0;
for(let i = 0; i < solutionArr.length; i++){
    sum += Number(solutionArr[i])
}*/

function factorial(arg){
    let product = BigInt(arg);

    for(let i = arg - 1; i > 0; i--){
        product = product*(BigInt(i));
    }
    return product.toString();
}

let oneHundredFactorial = factorial(100);
let solutionArr = oneHundredFactorial.split("");
let sum = 0;

for(let i = 0; i < solutionArr.length; i++){
    sum += Number(solutionArr[i]);
}

console.log(sum);
//node powerDigitSum.js