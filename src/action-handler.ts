import { ActionDictionary } from "./action/action-dictionary";
import { MessageBus } from "./message-bus";
import { Action } from "./parse-action";

export default class ActionHandler {
  constructor(
    private agentIds: string[],
    private messageBus: MessageBus,
    private actionDictionary: ActionDictionary
  ) {}

  async handle(agentId: string, { actionDef, parameters }: Action) {
    actionDef.handle({
      context: {
        sourceAgentId: agentId,
        allAgentIds: this.agentIds,
        actionDictionary: this.actionDictionary,
      },
      parameters,
      sendMessage: (message) => this.messageBus.send(message),
    });
  }
}
