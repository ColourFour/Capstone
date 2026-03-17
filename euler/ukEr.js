//In the United Kingdom the currency is made up of pound (£) and pence (p). There are eight coins in general circulation:
//1p, 2p, 5p, 10p, 20p, 50p, £1 (100p), and £2 (200p).
let sum = 0;

let oneP = 1;
let twoP = 2;
let fiveP = 5;
let tenP = 10;
let twentyP = 20;
let fiftyP = 50;
let pound = 100;
let twoPound = 200;

for(let i = 0; i <= 200; i++){
    for(let k = 0; k <= 100; k++){
        for(let j = 0; j <= 40; j++){
            for(let q = 0; q <= 20; q++){
                for(let a = 0; a <= 10; a++){
                    for(let b = 0; b <= 4; b++){
                        for(let c = 0; c <= 2; c++){
                            for(let d = 0; d <= 1; d++){
                                if(i*oneP + k*twoP + j*fiveP + q*tenP + a*twentyP + b*fiftyP + c*pound + d*twoPound == 200) sum += 1
                            }
                        }
                    }
                }
            }

        }
    }
}

console.log(sum)