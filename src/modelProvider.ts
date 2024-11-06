import { ChatOpenAI } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai";
import { ChatBedrockConverse } from "@langchain/aws";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';
import * as vscode from 'vscode';
import { logMessage } from "./outputChannel";

interface BaseModelConfig {
  temperature: number;
}

interface OpenAIModelConfig extends BaseModelConfig {
  openAIApiKey: string;
  modelName: string; 
}

interface AzureModelConfig extends BaseModelConfig {
  azureOpenAIApiKey: string;
  azureOpenAIApiDeploymentName: string;
  azureOpenAIEndpoint: string;
  azureOpenAIApiVersion?: string;
  modelName: string; 
}

interface AWSModelConfig extends BaseModelConfig {
  model: string;
  region: string;
  profile: string;
}

interface GoogleModelConfig extends BaseModelConfig {
  model: string;
  apiKey: string;
}

interface AnthropicModelConfig extends BaseModelConfig {
  apiKey: string;
  model: string; 
}

interface ModelResult {
  modelHandle: ChatOpenAI | AzureChatOpenAI | ChatBedrockConverse | ChatGoogleGenerativeAI | ChatAnthropic;
  isChatModel: boolean;
}

export function getModelHandle(providerOverride?: string, modelNameOverride?: string): ModelResult {
  const config = vscode.workspace.getConfiguration('genai.assistant');

  // Use the provider from the arguments, or fall back to the config
  const provider = (providerOverride || config.get<string>('provider').trim()).toLowerCase();

  // Common config
  const temperature = Number(config.get<string>('temperature', '0.5'));
  const isChatModel = config.get<boolean>(`${provider}.isChatModel`, true);

  try {
    logMessage(`Creating model for provider ${provider}`);
    switch (provider) {
      case 'openai': {
        const openaiConfig: OpenAIModelConfig = {
          temperature,
          openAIApiKey: process.env.OPENAI_API_KEY?.trim() || config.get<string>('openai.apiKey').trim() || '',
          modelName: modelNameOverride || config.get<string>('openai.modelName').trim(),
        };
        const modelHandle = new ChatOpenAI(openaiConfig);
        return {modelHandle, isChatModel};
      }
      case 'azure': {
        const azureConfig: AzureModelConfig = {
          temperature,
          azureOpenAIApiKey: process.env.AZURE_API_KEY?.trim() || config.get<string>('azure.apiKey').trim() || '',
          azureOpenAIApiDeploymentName: config.get<string>('azure.deployment').trim() || '',
          azureOpenAIEndpoint: config.get<string>('azure.endpoint').trim() || '',
          azureOpenAIApiVersion: config.get<string>('azure.version').trim(),
          modelName: modelNameOverride || config.get<string>('azure.modelName').trim(),
        };
        const modelHandle = new AzureChatOpenAI(azureConfig);
        return {modelHandle, isChatModel};
      }
      case 'aws': {
        const awsConfig: AWSModelConfig = {
          temperature,
          model: modelNameOverride || config.get<string>('aws.modelName').trim(),
          region: config.get<string>('aws.region').trim(),
          profile: config.get<string>('aws.profile').trim()
        };
        const modelHandle = new ChatBedrockConverse(awsConfig);
        return {modelHandle, isChatModel};
      }
      case 'google': {
        const googleConfig: GoogleModelConfig = {
          temperature,
          model: modelNameOverride || config.get<string>('google.modelName').trim(),
          apiKey: process.env.GOOGLE_GENAI_API_KEY?.trim() || config.get<string>('google.apiKey').trim() || '',
        };
        const modelHandle = new ChatGoogleGenerativeAI(googleConfig);
        return {modelHandle, isChatModel};
      }
      case 'anthropic': {
        const anthropicConfig: AnthropicModelConfig = {
          temperature,
          apiKey: process.env.ANTHROPIC_API_KEY?.trim() ||  config.get<string>('anthropic.apiKey').trim() || '',
          model: modelNameOverride || config.get<string>('anthropic.modelName').trim(),
        };
        const modelHandle = new ChatAnthropic(anthropicConfig);
        return {modelHandle, isChatModel};
      }
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error initializing model for provider: ${provider}`);
    logMessage(`Error initializing model for provider "${provider}": ${error.message}`);
    throw error;
  }
}

