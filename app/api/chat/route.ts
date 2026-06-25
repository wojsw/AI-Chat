import { deepseek } from '@ai-sdk/deepseek';
import {
  createAgentUIStreamResponse,
  createIdGenerator,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type InferAgentUIMessage,
  type UIMessage,
} from 'ai';
import { z } from 'zod';
import { loadChat, saveChat } from '@/lib/chat-store';
import { formatRAGContext, retrieveRAGContext } from '@/lib/rag';

export const maxDuration = 30;

type ChatRequest =
  | {
      trigger: 'submit-message';
      id: string;
      message: UIMessage;
    }
  | {
      trigger: 'regenerate-message';
      id: string;
      messageId?: string;
    };

const baseInstructions = `你是一个全面、可靠、主动且擅长解决复杂问题的 AI Agent。请始终使用中文简体回答，并根据用户目标提供清晰、可执行的帮助。

你的工作方式：
- 先理解用户的真实意图；如果需求不明确，先提出必要的澄清问题。
- 对简单问题直接给出简洁答案；对复杂任务先拆解步骤，再逐步推进。
- 优先给出可落地的方案、代码、示例、检查清单或下一步行动，而不是泛泛而谈。
- 在编程相关问题中，关注正确性、可维护性、边界情况、错误处理、类型安全和性能影响。
- 当用户提供代码或报错时，先定位问题根因，再给出修复方案；必要时说明权衡与替代方案。
- 不确定的信息要明确说明不确定性，不要编造事实、接口、依赖或外部资料。
- 必要时使用 Markdown、表格和代码块提升可读性，但避免无意义的冗长输出。
- 保持友好、专业、严谨的语气。

工具使用规则：
- 当用户询问当前时间、日期或现在几点时，必须调用 getCurrentTime 工具获取准确时间，不要自行猜测。
- 如果当前工具无法完成用户请求，请明确说明限制，并提供可行的替代方案。`;

function createAssistantAgent(instructions = baseInstructions) {
  return new ToolLoopAgent({
    id: 'chat-assistant',
    model: deepseek('deepseek-chat'),
    instructions,
    tools: {
      getCurrentTime: tool({
        description: '获取服务端当前时间、日期和时区信息',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            const now = new Date();

            return {
              ok: true,
              content: `当前时间：${now.toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour12: false,
              })}`,
              iso: now.toISOString(),
              timeZone: 'Asia/Shanghai',
            };
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            return {
              ok: false,
              content: `获取当前时间失败：${message}。请稍后重试，或使用系统时间作为替代。`,
            };
          }
        },
      }),
    },
    toolChoice: 'auto',
    stopWhen: stepCountIs(5),
  });
}

const assistantAgent = createAssistantAgent();

type AssistantUIMessage = InferAgentUIMessage<typeof assistantAgent>;

function getMessageText(message: UIMessage) {
  return message.parts
    .map(part => {
      if (part.type === 'text') return part.text;
      return '';
    })
    .join('\n')
    .trim();
}

function getLatestUserQuery(messages: UIMessage[]) {
  const latestUserMessage = messages.findLast(message => message.role === 'user');
  return latestUserMessage ? getMessageText(latestUserMessage) : '';
}

async function buildRAGInstructions(query: string) {
  if (!query) return baseInstructions;

  try {
    const ragContext = await retrieveRAGContext(query);
    const formattedContext = formatRAGContext(ragContext);

    return `${baseInstructions}

知识库增强规则：
- 回答前请优先参考下面的【知识库资料】。
- 如果【知识库资料】与用户问题相关，请基于资料回答，并尽量在回答中说明参考来源。
- 如果【知识库资料】为空或不足以回答，请明确说明“根据当前知识库无法确定”，不要编造知识库中不存在的事实。
- 如果用户问题与知识库无关，可以按通用助手能力正常回答，但不要声称这些内容来自知识库。

【知识库资料】
${formattedContext}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return `${baseInstructions}

知识库增强状态：
本次知识库检索失败，失败原因：${message}。你可以继续回答用户问题，但需要避免声称已经参考知识库资料。`;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatRequest;
  const chat = await loadChat(body.id);

  let messages = chat.messages;
  if (body.trigger === 'submit-message') {
    messages = [...messages, body.message];
  }

  if (body.trigger === 'regenerate-message') {
    const messageIndex = body.messageId
      ? messages.findIndex(message => message.id === body.messageId)
      : -1;

    if (messageIndex >= 0) {
      messages = messages.slice(0, messageIndex);
    } else if (messages.at(-1)?.role === 'assistant') {
      messages = messages.slice(0, -1);
    }
  }

  const agentMessages = messages as AssistantUIMessage[];
  const ragInstructions = await buildRAGInstructions(getLatestUserQuery(messages));
  const requestAgent = createAssistantAgent(ragInstructions);

  return createAgentUIStreamResponse({
    agent: requestAgent,
    uiMessages: agentMessages,
    abortSignal: req.signal,
    originalMessages: agentMessages,
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    onFinish: ({ messages: finishedMessages }) => {
      saveChat({ chatId: body.id, messages: finishedMessages as UIMessage[] });
    },
    onError: error => {
      if (error instanceof Error) return error.message;
      if (typeof error === 'string') return error;
      return '生成回复时发生未知错误。';
    },
  });
}
