/* 
=================================================================
LAB TITLE: Advanced JavaScript (Updated Reference File)
INSTRUCTIONS:
• Read each TODO description in the file.
• Use the Console (F12 → Console) to view outputs.
=================================================================
*/

// ==========================
// TODO-1: OBJECT with GETTERS & SETTERS
// ==========================
/*
Task:
1) Create an object representing a Student with at least: firstName, lastName, and gpa.
2) Add a getter fullName that returns "firstName lastName".
3) Add a setter updateGpa(newGpa) or use a set accessor for gpa that validates 0.0–4.0.
4) Create an instance/object and output its attributes using the getter(s).
*/

const Student = {
   // using factory so students can create multiple student objects
   create(firstName, lastName, initialGpa = 0.0) {
     return {
       firstName,
       lastName,
       _gpa: initialGpa, // internal storage
 
       // getter for full name
       get fullName() {
         return `${this.firstName} ${this.lastName}`;
       },
 
       // getter for gpa
       get gpa() {
         return this._gpa;
       },
 
       // setter accessor for gpa (validates 0.0 - 4.0)
       set gpa(newGpa) {
         const num = Number(newGpa);
         if (Number.isNaN(num) || num < 0.0 || num > 4.0) {
           throw new RangeError("GPA must be a number between 0.0 and 4.0");
         }
         this._gpa = num;
       },
 
       // alternative method-style setter (optional)
       updateGpa(newGpa) {
         this.gpa = newGpa; // reuse accessor (will validate)
       },
 
       // small helper to print the student
       toString() {
         return `Student: ${this.fullName}, GPA: ${this.gpa}`;
       }
     };
   }
 };
 
 // Create instance and demonstrate
 const alice = Student.create("Alice", "Walker", 3.2);
 console.log(alice.toString());            // uses getter fullName and gpa
 console.log("Full name:", alice.fullName);
 console.log("GPA before:", alice.gpa);
 
 // Update GPA via accessor and method (demonstrate both)
 alice.gpa = 3.6;
 console.log("GPA after setter:", alice.gpa);
 
 alice.updateGpa(3.9);
 console.log("GPA after updateGpa():", alice.gpa);
 
 // Demonstrate validation (commented out to avoid runtime throw in normal run)
 // try { alice.gpa = 5.0; } catch (e) { console.error("Validation error:", e.message); }
 
 
 // ==========================
 // TODO-2: OBJECT AS MAP + for...in LOOP
 // ==========================
 /*
 Task:
 1) Make an object used as a "map" (key → value), e.g., course codes → titles.
 2) Iterate over it with for...in and display each key and value.
 */
 
 const courseCatalog = {
   "CS101": "Intro to Computer Science",
   "WEB201": "Web Engineering",
   "MATH150": "Discrete Mathematics",
   "ENG210": "Technical Writing"
 };
 
 console.log("Course catalog (for...in):");
 for (const code in courseCatalog) {
   if (Object.prototype.hasOwnProperty.call(courseCatalog, code)) {
     console.log(`${code} → ${courseCatalog[code]}`);
   }
 }
 
 // Note: if insertion order matters, consider using Map instead of plain object:
 // const courseMap = new Map([["CS101", "Intro to Computer Science"], ...]);
 
 
 // =========================================
 // TODO-3: STRING OBJECT — charAt() & length
 // =========================================
 /*
 Task:
 1) Create a String object or plain string.
 2) Use .charAt(index) and .length to output characters and size.
 */
 
 const sample = "Hello, Web Engineering!";
 console.log("Sample string:", sample);
 console.log("Length:", sample.length);
 console.log("charAt(0):", sample.charAt(0));     // 'H'
 console.log("charAt(7):", sample.charAt(7));     // likely the character after comma
 // show each character with index
 for (let i = 0; i < sample.length; i++) {
   console.log(`charAt(${i}) = '${sample.charAt(i)}'`);
 }
 
 
 // ===================================
 // TODO-4: DATE — day, month, and year
 // ===================================
 /*
 Task:
 1) Create a Date for the current moment (new Date()).
 2) Find and display the current day of month, month (0–11), and year.
    (Hint: getDate(), getMonth(), getFullYear() )
 */
 
 const now = new Date();
 console.log("Now (Date object):", now);
 console.log("Day of month (getDate()):", now.getDate());            // 1 - 31
 console.log("Month (getMonth() -> 0-11):", now.getMonth());        // 0 = January
 console.log("Month (human 1-12):", now.getMonth() + 1);           // 1 = January
 console.log("Year (getFullYear()):", now.getFullYear());
 
 
 // ============================================================
 // TODO-5: ARRAY + SPREAD — find MIN and MAX from 10 numbers
 // ============================================================
 /*
 Task:
 1) Declare an array with 10 numbers (any values).
 2) Use spread syntax with Math.min(...) and Math.max(...) to find extremes.
 3) Display both values.
 */
 
 const numbers = [12, -4, 0, 56, 23, 8, 100, 42, 7, 3];
 console.log("Numbers:", numbers);
 
 // Use spread to get min/max
 const min = Math.min(...numbers);
 const max = Math.max(...numbers);
 console.log("Min:", min);
 console.log("Max:", max);
 
 
 // ===================================================================
 // TODO-6: EXCEPTIONS — try/catch/finally with EMPTY ARRAY edge case
 // ===================================================================
 /*
 Task:
 1) Write a function that expects a non-empty array and returns the maximum element of the array.
 2) Intentionally pass an empty array to trigger an error.
 3) Handle the error using try { ... } catch (e) { ... } finally { ... } and log messages
    in each block so you can see the flow of control.
 */
 
 function maxOfArray(arr) {
   if (!Array.isArray(arr)) {
     throw new TypeError("Argument must be an array");
   }
   if (arr.length === 0) {
     throw new Error("Expected a non-empty array");
   }
   // assuming array of numbers
   return Math.max(...arr);
 }
 
 // Intentionally pass an empty array to trigger the error
 console.log("=== TODO-6: exceptions demo ===");
 try {
   console.log("Calling maxOfArray with []");
   const result = maxOfArray([]);
   console.log("This line will not run for empty array. Result:", result);
 } catch (e) {
   console.error("Caught an error:", e.name, "-", e.message);
 } finally {
   console.log("Finally block executed (cleanup or final logging).");
 }
 
 // Show correct usage
 try {
   console.log("Calling maxOfArray with numbers:", numbers);
   console.log("Max is", maxOfArray(numbers));
 } catch (e) {
   console.error("Unexpected error:", e);
 }
 
 
 // ===================================================================================
 // TODO-7: REGEX + forEach — find words containing 'ab' and log matches from the list
 // ===================================================================================
 /*
 Task:
 Given: const words = ["ban", "babble", "make", "flab"];
 1) Create a RegExp that detects the substring "ab" anywhere in a word.
 2) Loop with .forEach() and use pattern.test(word) to check matches.
 3) For matches, log "<word> matches!".
 4) Display the words that matches the pattern.
 */
 
 const words = ["ban", "babble", "make", "flab", "ABacus", "cab"];
 // Use case-insensitive pattern without global flag to avoid test() state issues
 const pattern = /ab/i;
 
 console.log("Words list:", words);
 
 const matched = [];
 words.forEach((w) => {
   if (pattern.test(w)) {        // pattern.test is OK since no 'g' flag
     console.log(`${w} matches!`);
     matched.push(w);
   } else {
     console.log(`${w} does NOT match.`);
   }
 });
 
 console.log("Words that match the pattern:", matched);
 
 
 // ==========================
 // End of Reference File
 // ==========================
 