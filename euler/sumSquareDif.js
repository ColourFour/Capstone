let naturalArray = [];
let naturalSquares = [];
let sumNat = 0;
let sumSquare = 0;

for(let i = 0; i <= 100; i++){
    naturalArray.push(i);
    naturalSquares.push(i*i);
    sumNat += naturalArray[i];
    sumSquare += naturalSquares[i];
}

console.log(sumNat*sumNat - sumSquare)

//node sumSquareDif.js