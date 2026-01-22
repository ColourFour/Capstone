//7th triangle number = 1 + 2 + 3 + 4 + 5 + 6 + 7 = 28
//28 is first triangle with 5 divisors
//what is the first to have over five hundred divisors 

//if n = p1^x * p2^y * ... 
//divisors = (x + 1)*(y + 1) * ...
function countDivisors(n) {
    let count = 0;
    const sqrtN = Math.sqrt(n);
    
    for (let i = 1; i <= sqrtN; i++) {
        if (n % i === 0) {
            // Count both i and n/i as divisors
            count += (i * i === n) ? 1 : 2;
        }
    }
    return count;
}

function findTriangleWithDivisors(target) {
    let n = 1;
    let triangle = 1;
    
    while (true) {
        // n and n+1 are coprime, so we can compute divisors efficiently
        let divisors;
        if (n % 2 === 0) {
            divisors = countDivisors(n/2) * countDivisors(n+1);
        } else {
            divisors = countDivisors(n) * countDivisors((n+1)/2);
        }
        
        if (divisors > target) {
            return triangle;
        }
        
        n++;
        triangle += n;
    }
}

console.log(findTriangleWithDivisors(500));

//node triangleNumbers.js