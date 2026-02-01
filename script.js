/* 
=================================================================
LAB TITLE: Advanced JavaScript (Reference Solution)
INSTRUCTIONS:
• Read the TODO description.
• Use the Console (F12 → Console) to view outputs.
=================================================================
*/

// ==========================
// TODO-1: OBJECT with GETTERS & SETTERS
// ==========================

const student = {
   firstName: "John",
   lastName: "Doe",
   _gpa: 3.0,

   get fullName() {
      return `${this.firstName} ${this.lastName}`;
   },

   get gpa() {
      return this._gpa;
   },

   set gpa(newGpa) {
      if (newGpa >= 0.0 && newGpa <= 4.0) {
         this._gpa = newGpa;
      } else {
         console.error("Invalid GPA value");
      }
   },

   updateGpa(newGpa) {
      this.gpa = newGpa;
   }
};

console.log("Student Name:", student.fullName);
console.log("Student GPA:", student.gpa);
student.updateGpa(3.7);
console.log("Updated GPA:", student.gpa);


// ====================================
// TODO-2: OBJECT AS MAP + for...in LOOP
// ====================================

const courses = {
   WEB101: "HTML & CSS",
   WEB201: "JavaScript",
   WEB301: "Web Engineering"
};

console.log("Course List:");
for (const code in courses) {
   console.log(`${code}: ${courses[code]}`);
}


// =========================================
// TODO-3: STRING OBJECT — charAt() & length
// =========================================

const text = "JavaScript";
console.log("String:", text);
console.log("Length:", text.length);
console.log("First character:", text.charAt(0));
console.log("Last character:", text.charAt(text.length - 1));


// ===================================
// TODO-4: DATE — day, month, and year
// ===================================

const today = new Date();
console.log("Day:", today.getDate());
console.log("Month (0-11):", today.getMonth());
console.log("Year:", today.getFullYear());


// ============================================================
// TODO-5: ARRAY + SPREAD — find MIN and MAX from 10 numbers
// ============================================================

const nums = [5, 12, 3, 99, 42, -7, 18, 0, 27, 8];
console.log("Numbers:", nums);
console.log("Min:", Math.min(...nums));
console.log("Max:", Math.max(...nums));


// ===================================================================
// TODO-6: EXCEPTIONS — try/catch/finally with EMPTY ARRAY observation
// ===================================================================

// Task 6.1 (Observation only)
const arr = [];

// DO NOT run this for submission
// console.log(arr[0].toString());

// Task 6.2 (Graded)
try {
   console.log(arr[0].toString());
} catch (e) {
   console.log("Caught:", e.message);      // contains "Caught"
} finally {
   console.log("Finally:", "done");        // contains "Finally"
}




// ===================================================================================
// TODO-7: REGEX + forEach — find words containing 'ab'
// ===================================================================================

const words = ["ban", "babble", "make", "flab"];
const pattern = /ab/;

const matches = [];
words.forEach(word => {
   if (pattern.test(word)) {
      console.log(`${word} matches!`);
      matches.push(word);
   }
});

console.log("Matched words:", matches);


// ==========================
// End of Lab Reference File
// ==========================
