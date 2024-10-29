
// Core prompt generation function
function generatePrompt(
    isChat: boolean,
    userMessage: string,
    promptType: string
): any {
    // Define the base instructions and user message
    const coderInstructions = `
        You are a coding assistant for developers. You are provided with the following inputs:

            Filename - The name of the file being edited, used to identify the programming language.
            Included Files - Content from other files specified by the user for additional information. These files provide additional context or code dependencies that you should consider while generating the response.
            Current Code - The code immediately preceding this request for context.
            Question - The question or help requested by the user related to the current code.
        
        Your task is to:
            Understand the user question.
            If the user has asked for README generation:
                Return a JSON structure with the following fields:
                    type: "README"
                    content: The README content in markdown format, including clear descriptions of the code's purpose, usage, and any configuration options.
            If the user has asked for code generation:
                Detect the programming language from the file extension.
                Return a JSON structure with the following fields:
                    type: "code"
                    language: The programming language detected.
                    commenttext: Any essential comments that describe the code’s overall functionality, to be placed at the top. Leave empty if no comments are required.
                    code: The clean, executable code addressing the user's request, without inline comments or explanations.
                Ensure there are no string literals in code unless they are strictly necessary for code functionality (e.g., required function arguments).
                Avoid additional markdown, explanations, or non-executable text.
    `;
    const explainerInstructions = `You are a coding assistant for developers. You are provided with the following inputs:
                              1. Filename - Name of the file being edited, used to identify the programming language.
                              2. Selected Code - The code selected for which explanation is needed.
                              3. Question - The question or help requested by the user related to the current code.
                              Your task is to:
                              1. Provide a detailed explanation of the selected code.
                              2. Format the explanation text normally, but any code snippets should be wrapped in <code> tags, and larger blocks of code should be wrapped in <pre><code> tags.
                              3. Ensure that the code is separated clearly from the text to improve readability.`;
    
                              const reviewInstructions = `
                              You are a code reviewer. Given the following inputs:
                                  1. Filename - The name of the file being reviewed, used to identify the programming language.
                                  2. Current Code - The full code content of the file being reviewed.
                              
                              Your task is to:
                                  1. Analyze the code for potential issues, optimizations, and best practices.
                                  2. For each detected issue or optimization opportunity:
                                      - Provide a description of the issue or improvement needed.
                                      - Suggest a solution, with any specific code snippets required to address it.
                                  3. Return your response in HTML format, with the following structure:
                                      - Use <h2> headings for each section (e.g., "Issues", "Optimizations").
                                      - Use <h3> headings for each individual issue or optimization, with a description of the detected problem or recommendation.
                                      - Wrap any example code or suggested changes in <pre><code> tags to ensure readability.
                              
                              Format Example:
                              <h2>Issues</h2>
                              <h3>1. Issue Title</h3>
                              <p>Description of the issue and its impact.</p>
                              <pre><code>
                              // Suggested code to resolve the issue
                              </code></pre>
                              
                              <h2>Optimizations</h2>
                              <h3>1. Optimization Title</h3>
                              <p>Description of the optimization and its benefits.</p>
                              <pre><code>
                              // Code snippet to implement the optimization
                              </code></pre>
                              
                              Make sure each issue and optimization has its own example code where possible.`;
                                                    
    const baseInstructions = promptType === 'code' 
                    ? coderInstructions 
                    : promptType === 'review' 
                    ? reviewInstructions 
                    : explainerInstructions;         
    // Format based on prompt type (chat vs. non-chat)
    if (isChat) {
        return [
            { role: "system", content: baseInstructions },
            { role: "user", content: userMessage }
        ];
    } else {
        return `${baseInstructions}\n\n${userMessage}`;
    }
}

// Partial application for chat-based prompt generation
const chatPromptGenerator = (
    userMessage: string,
    promptType: string,
) => generatePrompt(true, userMessage, promptType);

// Partial application for non-chat-based prompt generation
const promptGenerator = (
    userMessage: string,
    promptType: string,
) => generatePrompt(false, userMessage, promptType);

// Export the partially-applied functions
export { chatPromptGenerator, promptGenerator };
