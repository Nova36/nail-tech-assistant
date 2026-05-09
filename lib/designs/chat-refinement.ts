export type ChatTurn = {
  id: string;
  designId: string;
  userId: string;
  message: string;
  status: 'pending' | 'success' | 'failed' | string;
  generationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export class EmptyMessageError extends Error {
  constructor(message = 'Refinement message must not be empty.') {
    super(message);
    this.name = 'EmptyMessageError';
  }
}

const MAX_CHAT_TURNS = 5;

function formatRefinement(index: number, message: string): string {
  return `[Refinement ${index + 1}]: ${message.trim()}`;
}

export function accumulateChatInstructions(input: {
  priorTurns: ChatTurn[];
  nextMessage: string;
}): {
  compiledPrompt: string;
  sessionFull?: true;
} {
  const trimmedNextMessage = input.nextMessage.trim();

  if (!trimmedNextMessage) {
    throw new EmptyMessageError();
  }

  const compiledPriorTurns = input.priorTurns
    .slice(0, MAX_CHAT_TURNS)
    .map((turn, index) => formatRefinement(index, turn.message));

  if (input.priorTurns.length >= MAX_CHAT_TURNS) {
    return {
      compiledPrompt: compiledPriorTurns.join('\n'),
      sessionFull: true,
    };
  }

  return {
    compiledPrompt: [
      ...compiledPriorTurns,
      formatRefinement(input.priorTurns.length, trimmedNextMessage),
    ].join('\n'),
  };
}
