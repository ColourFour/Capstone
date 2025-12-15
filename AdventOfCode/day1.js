let testData = "11-22,95-115,998-1012,1188511880-1188511890,222220-222224,1698522-1698528,446443-446449,38593856-38593862,565653-565659,824824821-824824827,2121212118-2121212124";
let testArray = testData.split(",");
let testStartEnd = testArray.map(range => range.split("-"));

for(let j = 0; j < testArray.length; j++){
for(let i = testStartEnd[j][0]; i < testStartEnd[j][1]; i++)
    {
        console.log(`The value is ${i}`);
    }
}

//Since the young Elf was just doing silly patterns, you can find the invalid IDs by looking for any ID which is made only of some sequence of digits repeated twice. 
// So, 55 (5 twice), 6464 (64 twice), and 123123 (123 twice) would all be invalid IDs.
//None of the numbers have leading zeroes; 0101 isn't an ID at all. (101 is a valid ID that you would ignore.)