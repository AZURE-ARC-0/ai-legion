import { Action } from "./action-types";
import { Message, messageBuilder } from "./message";
import { MessageBus } from "./message-bus";

export default class ActionHandler {
  constructor(private agentIds: string[], private messageBus: MessageBus) {}

  async handle(agentId: string, { payload }: Action) {
    switch (payload.type) {
      // case "no-op":
      //   this.messageBus.send(
      //     messageBuilder.generic(
      //       agentId,
      //       `Are you sure there isn't anything you'd like to do? Maybe you should reach out and network with one of the other agents.`
      //     )
      //   );
      //   break;
      case "query-agent-registry":
        this.messageBus.send(
          messageBuilder.generic(
            agentId,
            `These are the agents in the system:\n\nControl [agentId="0"]\n${this.agentIds
              .map((id) => `Agent ${id} [agentId="${id}"]`)
              .join("\n")}`
          )
        );
        break;
      case "send-message":
        const { targetAgentId } = payload;
        if (targetAgentId === "0")
          this.messageBus.send(
            messageBuilder.generic(
              agentId,
              `Thanks for your message, I will forward it to my human counterpart and then get back to you with their response.`
            )
          );
        else if (this.agentIds.includes(payload.targetAgentId))
          this.messageBus.send(
            messageBuilder.agentToAgent(
              agentId,
              [targetAgentId],
              payload.message
            )
          );
        else
          this.messageBus.send(
            messageBuilder.generic(
              agentId,
              `You tried to send your message to an invalid targetAgentId (${payload.targetAgentId}). You can use the 'query-agent-registry' action to see a list of available agents and their agent IDs.`
            )
          );
        break;
    }
  }
}
