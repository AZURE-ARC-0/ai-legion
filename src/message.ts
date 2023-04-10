import actionDictionary from "../schema/action-dictionary.json";
import { ChatCompletionRequestMessage } from "openai";
import { agentName, MULTILINE_DELIMITER } from "./util";

export interface Message {
  type: MessageType;
  source: MessageSource;
  targetAgentIds: string[];
  content: string;
}

export type MessageType = keyof typeof messageBuilder;

export type MessageSource = SystemMessageSource | AgentMessageSource;

interface MessageSourceBase {
  id?: string;
}

interface SystemMessageSource extends MessageSourceBase {
  type: "system";
  id?: undefined;
}

interface AgentMessageSource extends MessageSourceBase {
  type: "agent";
  id: string;
}

export const systemSource: SystemMessageSource = { type: "system" };
export const agentSource = (id: string): AgentMessageSource => ({
  type: "agent",
  id,
});

const CODE_BLOCK_DELIMITER = "```";

export const messageBuilder = addMessageTypes({
  primer: systemMessageBuilder(
    (agentId) => `You are ${agentName(
      agentId
    )}, one of potentially several sophisticated autonomous entities who is able to communicate with me and one another to accomplish tasks together. I am your liaison to the real world, able to carry out actions which you will send in response to my messages.

Respond to every message with an action in the following format:

${CODE_BLOCK_DELIMITER}
<action name>
<arg 1 name>: <prop value>
<arg 2 name>: <prop value>
...
${CODE_BLOCK_DELIMITER}

For example, this would be considered a valid action:

${CODE_BLOCK_DELIMITER}
send-message
targetAgentId: 0
message: Hello, Control!
${CODE_BLOCK_DELIMITER}

You can write multi-line argument values delimited with the sentinal value "${MULTILINE_DELIMITER}", like so:

${CODE_BLOCK_DELIMITER}
send-message
targetAgentId: 2
message: 
${MULTILINE_DELIMITER}
Hello, this is a multi-line message.
This is a new line.
This is another line.
${MULTILINE_DELIMITER}
${CODE_BLOCK_DELIMITER}

Do not just make up actions or arguments. You need to discover what actions are available and what specific arguments they take. You can see the available actions by using the \`help\` action:

${CODE_BLOCK_DELIMITER}
help
${CODE_BLOCK_DELIMITER}

Then you can see what arguments a specific action takes with:

${CODE_BLOCK_DELIMITER}
help
aboutAction: <action name>
${CODE_BLOCK_DELIMITER}

Every time you receive a message, you must decide on an action to take. If there's nothing you feel like you need to do at the moment, you can use the \`no-op\` action.

You will periodically receive a "heartbeat" message, giving you a chance to take an action. Again, if you don't feel like there's anything to be done just choose the \`no-op\` action (but you must choose a valid action!) If you want to respond to me, use the \`send-message\` action as described above.

In the course of your work you may be assigned tasks by other agents, at which point you will work towards accomplishing them using the actions at your disposal.
`
  ),

  heartbeat: systemMessageBuilder(
    () =>
      `This is your regularly scheduled heartbeat message. Is there anything you need to do?`
  ),

  listAllActions: systemMessageBuilder(
    () => `You can take the following actions:

${actionDictionary.oneOf
  .map((action) => action.properties.name.const)
  .join("\n")}

To get help on a specific action, use the \`help\` action with the \`aboutAction\` argument set to the name of the action you want help with. For example:

${CODE_BLOCK_DELIMITER}
help
aboutAction: send-message
${CODE_BLOCK_DELIMITER}
`
  ),

  helpOnAction: (actionId: string, aboutAction: string) =>
    systemMessageBuilder(() => {
      const actionSchema = actionDictionary.oneOf.find(
        (action) => action.properties.name.const === aboutAction
      );
      if (!actionSchema)
        return `Unknown action \`${aboutAction}\`. Try using \`help\` with no arguments to see what actions are available.`;
      return `Usage:

${CODE_BLOCK_DELIMITER}
${actionSchema.properties.name.const}
${Object.entries(actionSchema.properties)
  .flatMap(([argName, { description }]) =>
    argName === "name"
      ? []
      : [
          `${argName}: <${description.toLowerCase()}>${
            !actionSchema.required.includes(argName) ? " (optional)" : ""
          }`,
        ]
  )
  .join("\n")}
${CODE_BLOCK_DELIMITER}
`;
    })(actionId),

  noResponseError: systemMessageBuilder(
    () => `No response received, could you try again?`
  ),

  malformattedResponseError: systemMessageBuilder(
    () =>
      `Your last message wasn't formatted correctly. If you need help, respond with simply:

${CODE_BLOCK_DELIMITER}
help
${CODE_BLOCK_DELIMITER}
`
  ),

  listAgents: (agentId: string, agentIds: string[]) =>
    systemMessageBuilder(
      () =>
        `These are the agents in the system:\n\n${agentIds
          .map((id) => `${agentName(id)} [agentId=${id}]`)
          .join("\n")}`
    )(agentId),

  generic: (agentId: string, content: string) =>
    systemMessageBuilder(() => content)(agentId),

  agentToAgent: (
    sourceAgentId: string,
    targetAgentIds: string[],
    content: string
  ) => ({
    source: agentSource(sourceAgentId),
    targetAgentIds,
    content,
  }),
});

function addMessageTypes<
  T extends Record<string, (...args: any) => Omit<Message, "type">>
>(record: T): { [K in keyof T]: (...args: Parameters<T[K]>) => Message } {
  for (const [standardMessageType, builder] of Object.entries(record)) {
    (record as any)[standardMessageType] = (...args: any) => ({
      messageType: standardMessageType,
      ...(builder as any)(...args),
    });
  }
  return record as any;
}

function systemMessageBuilder(getContent: (agentId: string) => string) {
  return (agentId: string): Omit<Message, "type"> => ({
    source: systemSource,
    targetAgentIds: [agentId],
    content: getContent(agentId),
  });
}
