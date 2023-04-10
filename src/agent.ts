import { ChatCompletionRequestMessage } from "openai";
import { convertTypeAcquisitionFromJson } from "typescript";
import actionDictionary from "../schema/action-dictionary.json";
import eventDictionary from "../schema/event-dictionary.json";
import { Action } from "./action-types";
import { EventLog } from "./event-log";
import { Event } from "./event-types";
import { Memory } from "./memory";
import generateText from "./openai";
import { parseAction } from "./parsers";

export class Agent {
  constructor(
    public id: string,
    private eventLog: EventLog,
    private memory: Memory
  ) {}

  async handleEvent(event: Event): Promise<Action | undefined> {
    const mementos = await this.memory.append({ type: "event", event });

    const { data, status } = await generateText([
      initialSystemPrompt,
      ...mementos.map((m): ChatCompletionRequestMessage => {
        switch (m.type) {
          case "event":
            return { role: "user", content: JSON.stringify(m.event) };
          case "action":
            return { role: "assistant", content: JSON.stringify(m.action) };
        }
      }),
    ]);

    if (status !== 200) {
      console.error(`Non-200 status received: ${status}`);
      return;
    }

    const actionJson = data.choices[0].message?.content;
    if (!actionJson) {
      console.error("no response received");
      return;
    }

    const action = parseAction(actionJson);
    if (action) {
      await this.memory.append({ type: "action", action });
    }

    return action;
  }
}

const initialSystemPrompt: ChatCompletionRequestMessage = {
  role: "system",
  content: `
    You aren Agent who is responding to Events with Actions to be taken in response. You are not
    able to communicate in natural language, only in JSON format that strictly follows a schema.

    Every message I send to you will be an Event, conforming to the following Event Dictionary,
    which is a JSON Schema:

    ${JSON.stringify(eventDictionary, null, 2)}

    Use it to interpret the meaning of the Event, and then decide on an Action to take. Actions
    are defined in the Action Dictionary, which is also a JSON Schema:

    ${JSON.stringify(actionDictionary, null, 2)}

    Every message you send to me must be a valid JSON object that conforms exactly to this schema.
    You should reflect on the contents of the Event and decide on a course of Action.

    No matter what, you MUST pick an Action and your message should JUST be the JSON and nothing
    else. If you can't pick an Action that seems reasonable, just pick one at random, but it must
    be valid according to the Action Dictionary.

    Any extra commentary about your thought process can go in the 'comment' field of the Action.
  `,
};
