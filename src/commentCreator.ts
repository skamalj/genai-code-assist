import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
import { chatPromptGenerator, promptGenerator } from './promptBuilder.js';
import { logMessage } from './outputChannel.js';

// Function to create a comment above the selected code
export async function addComment(selectedText: string | undefined): Promise<void> {
    if (!selectedText) {
        vscode.window.showInformationMessage("No code selected");
        return;
    }

    const comment = await generateCommentForCode(selectedText);
    const cleanedComment = comment.replace(/```[\w]*\n?|```/g, '').trim();

    if (comment) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const position = selection.start;
            const commentText = `${cleanedComment }\n`;

            await editor.edit(editBuilder => {
                editBuilder.insert(position, commentText);
            });
        }
    }
}

// Function to call OpenAI API and generate a comment for the code
async function generateCommentForCode(selectedText: string): Promise<string | undefined> {
    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;

    if (!document) return;

    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Generating comment...",
        cancellable: false
    }, async (progress) => {
        try {
            const userMessage = `
            FileName: ${vscode.workspace.asRelativePath(document.uri)}
            Selected Code: ${selectedText}
            Question: Provide a concise comment for selected code
            `;
            const { modelHandle, isChatModel } = getModelHandle();
            const messages = isChatModel ? chatPromptGenerator(userMessage, 'comment') : 
                        promptGenerator(userMessage, 'comment');

            const response = await modelHandle.invoke(messages);
            const commentText = response.content || '';
            return commentText as string;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to generate comment`);
            logMessage(`Failed to generate comment: ${error}`);
        }
    });
}
