//a^2 + b^2 = c^2
//a + b + c = 1000
//find product abc
let legA = 0;
let legB = 0;
let hypno = 0;

for (let i = 0; i < 1000; i++) {
  legA = i;
  for (let j = 0; j < 1000; j++) {
    legB = j;
    for (let k = 0; k < 1000; k++) {
      hypno = k;
      if (legA + legB + hypno === 1000 && legA * legA + legB * legB === hypno * hypno) {
        console.log(legA * legB * hypno);
      }
    }
  }
}

//node pythTriple.js