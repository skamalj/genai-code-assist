import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
import { chatPromptGenerator, promptGenerator } from './promptBuilder.js';
import { logMessage } from './outputChannel.js';

// Function to call OpenAI and display code review in a webview panel
export async function reviewCode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    
    if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
    }

    const document = editor.document;
    const fileContent = document.getText();

    const review = await callOpenAIForReview(fileContent, document.fileName);
    const cleanedReview = review.replace(/```[\w]*\n?|```/g, '').trim();

    // Display the review in a webview panel
    const panel = vscode.window.createWebviewPanel(
        'reviewCodePanel',    // Internal identifier
        'Code Review',        // Title of the panel
        vscode.ViewColumn.Beside, // Editor column to show the new panel in
        {}                    // Webview options
    );

    panel.webview.html = getWebviewContent(cleanedReview);
}

// Function to call OpenAI API for code review
async function callOpenAIForReview(fileContent: string, fileName: string) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Requesting Code Review...",
        cancellable: false
    }, async (progress) => {
        try {
            const userMessage = `FileName: ${fileName}
                            Full Code: ${fileContent}
                            Question: Provide a detailed code review, highlighting best practices, optimizations, and any issues. Format your response with clear headings and explanations.`;
            
            const { modelHandle, isChatModel } = getModelHandle();
            const messages = isChatModel ? chatPromptGenerator(userMessage, 'review') : 
                        promptGenerator(userMessage, 'review');

            const timeout = vscode.workspace.getConfiguration('genai.assistant').get<number>('timeout');
            const response = await modelHandle.invoke(messages, { timeout: timeout*1000 });
            const completionText = response.content || '';
            return completionText as string;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to review`);
            logMessage(`Failed to review: ${error}`);
        }
    });
}

// Function to return HTML content for the webview
function getWebviewContent(review: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=0.5">
            <title>Code Review</title>
            <style>
                body { line-height: 1.0; margin: 10px; padding: 10px;}
                h1 { font-size: 24px; margin-bottom: 10px; }
                code {background-color: transparent;  }
                pre { white-space: pre-wrap;  word-wrap: break-word; background-color: transparent; border-radius: 5px; border: solid 1px;}
            </style>
        </head>
        <body>
            <h1>Code Review</h1>
            ${review}
        </body>
        </html>
    `;
}

