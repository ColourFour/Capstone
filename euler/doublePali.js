let sum = 0;

function isPalindrome(n) {
  const s = String(n);
  return s === s.split("").reverse().join("");
}

for (let i = 1; i < 1000000; i++) {
  if (isPalindrome(i)) {
    let binary = [];
    let k = i;
    while(k > 0){
    if(k % 2 == 0) binary.push(0);
    else binary.push(1);
    k = Math.floor(k / 2);
    if(k == 1) {
      binary.push(1);
      break
    }
    }
    if(isPalindrome(binary)) sum += i

  }
}

console.log(sum)