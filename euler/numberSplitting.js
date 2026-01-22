//S = natural number n
//square root of 81 = 8 + 1 is in S
//square root of 6724 = 6 + 7 + 4 is in S
//T(N) is the sum of all S with n <= N. T(10^4) = 41333
//Find T(10^12)

let sum = 0;
let n = 1;
let i = 1;
let sArray = [];

while(sum < 100000){
    n = 1;
    for(let i = 1; i < n; i++){
        if(n / (i * i) == 1){
            let add = 0;
            let array = n.toString().split("");
            for(let i = 0; i < array.length; i++){
                add += parseInt(array[i])
            }
            if(add == n) sum += n;
        }
    }
    n += 1;
    
}

console.log(sum);

//node numberSplitting.js