//Find the largest palindrome made from the product of two 3-digit numbers.    
let palindrome = [];
let max = 0;
for(let i = 100; i < 1000; i++){
        for(let k = 100; k < 1000; k++){
            let product = i*k;
            let productArr = Array.from(String(product), Number);
            if(productArr[0] == productArr[productArr.length - 1] && productArr[1] == productArr[productArr.length - 2] && productArr[2] == productArr[productArr.length -3]) palindrome.push(product);
        }
    }

for(let i = 0; i < palindrome.length; i++){
    if(max < palindrome[i]) max = palindrome[i];
}
    console.log(max)
//node palindromeProduct.js