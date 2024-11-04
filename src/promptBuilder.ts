import fs from 'fs';
import path from 'path';

// Function to read instructions from text files
const readInstructionsFromFile = (fileName) => {
    const filePath = path.join(__dirname, 'prompts', fileName);
    return fs.readFileSync(filePath, 'utf8');
};

// Core prompt generation function
function generatePrompt(
    isChat: boolean,
    userMessage: string,
    promptType: string
): any {
    // Read instructions from text files
    const coderInstructions = readInstructionsFromFile('coderInstructions.txt');
    const explainerInstructions = readInstructionsFromFile('explainerInstructions.txt');
    const reviewInstructions = readInstructionsFromFile('reviewInstructions.txt');
    const commentInstructions = readInstructionsFromFile('commentInstructions.txt');

    let baseInstructions;
    switch (promptType) {
        case 'code':
            baseInstructions = coderInstructions;
            break;
        case 'review':
            baseInstructions = reviewInstructions;
            break;
        case 'comment':
            baseInstructions = commentInstructions;
            break;
        default:
            baseInstructions = explainerInstructions;
            break;
    }

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
