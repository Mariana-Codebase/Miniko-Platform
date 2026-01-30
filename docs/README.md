Miniko Docs

Project status
Miniko is under active development. Bugs, unexpected behavior, or missing syntax
support may occur. If something fails, reduce the code to a minimal example and
step through the execution.

What is Miniko?
Miniko is an educational visualizer that interprets a subset of Python, Java,
TypeScript, and Rust to show state and output step by step. It is not a real
compiler or a professional debugger.

Ideal for desktop, responsive on any device
The interface is designed for desktop because it shows multiple panels at once,
but it is responsive and adapts to smaller screens.

How to use it
1. Paste a short code snippet into the editor.
2. Miniko detects the language automatically.
3. Use the step buttons to move forward and backward.
4. Watch:
   - Code: current line highlight.
   - Frames: local variables for the current step.
   - State: changes between steps.
   - Output: accumulated output.
5. Check the Autotests panel to validate expected outputs.

Autotests
The Autotests panel (footer) runs reference examples for each supported language
and compares the actual output with the expected output. If something changes in
the interpreter, the panel makes it visible immediately.

Language support (summary)
Python
- Numeric variables, basic lists.
- If, for with range, print, and simple f-strings.

Java
- int, simple arrays, element access, and length.
- if, for with i++, basic comparisons.
- System.out.println with concatenation.

TypeScript
- Assignments, simple arrays, basic operations.
- console.log with template strings.

Rust
- vec!, range for (.. and ..=), and for over simple lists.
- println! with {} placeholders.

Known limitations
- No external libraries or real IO.
- No complex data structures or async/concurrency.
- Interpretation is approximate and designed for intro classes.
- Long loops may be truncated by the step limit.

Tips for reporting bugs
- Provide the smallest code that reproduces the issue.
- Mention the detected language.
- Describe expected vs actual behavior.
- Attach a screenshot if possible.
