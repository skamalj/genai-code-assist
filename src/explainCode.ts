import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
import { chatPromptGenerator, promptGenerator } from './promptBuilder.js';
import { logMessage } from './outputChannel.js';


// Function to call OpenAI and display explanation in a webview panel
export async function explainCode(selectedText: string | undefined): Promise<void> {
    if (!selectedText) {
        vscode.window.showInformationMessage("No code selected");
        return;
    }

    const explanation = await callOpenAIForExplanation(selectedText);
    const cleanedExplanation = explanation.replace(/```[\w]*\n?|```/g, '').trim();

    // Display the explanation in a webview panel
    const panel = vscode.window.createWebviewPanel(
        'explainCodePanel',   // Internal identifier
        'Code Explanation',   // Title of the panel
        vscode.ViewColumn.Beside, // Editor column to show the new panel in
        {}                    // Webview options
    );

    panel.webview.html = getWebviewContent(cleanedExplanation);
}

// Function to call OpenAI API
async function callOpenAIForExplanation(selectedText: string) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Requesting Explanation...",
        cancellable: false
    }, async (progress) => {
        try {
            
            const userMessage = `FileName: ${vscode.workspace.asRelativePath(document.uri)}
                            Selected Code: ${selectedText}
                            Question: Provide a detailed explanation for the selected code, ensuring that code snippets are formatted distinctly from the text.`
                            ;
            const { modelHandle, isChatModel } = getModelHandle();
            const messages = isChatModel ? chatPromptGenerator(userMessage, 'explain') : 
                        promptGenerator(userMessage, 'explain');

            const timeout = vscode.workspace.getConfiguration('genai.assistant').get<number>('timeout');
            const response = await modelHandle.invoke(messages, {timeout: timeout*1000});
            const completionText = response.content || '';
            return completionText as string;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch explanation`);
            logMessage(`Failed to fetch explanation: ${error}`);
        }
    });
}

// Function to return HTML content for the webview
function getWebviewContent(explanation: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=0.5">
            <title>Explanation</title>
            <style>
                body { line-height: 1.0; margin: 10px; padding: 10px;}
                h1 { font-size: 24px; margin-bottom: 10px; }
                code {background-color: transparent;  }
                pre { white-space: pre-wrap;  word-wrap: break-word; background-color: transparent; border-radius: 5px; border: solid 1px;}
            </style>
        </head>
        <body>
            <h1>Explanation</h1>
            ${explanation}
        </body>
        </html>
    `;
}
