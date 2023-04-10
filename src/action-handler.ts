import { readdir, readFile, statSync, writeFile } from "fs";
import { join as joinPath, resolve as resolvePath } from "path";
import { Action } from "./action-types";
import { messageBuilder } from "./message";
import { MessageBus } from "./message-bus";

export default class ActionHandler {
  constructor(private agentIds: string[], private messageBus: MessageBus) {}

  async handle(agentId: string, action: Action) {
    switch (action.name) {
      case "no-op":
        //   this.messageBus.send(
        //     messageBuilder.generic(
        //       agentId,
        //       `Are you sure there isn't anything you'd like to do? Maybe you should reach out and network with one of the other agents.`
        //     )
        //   );
        break;

      case "help":
        if (!action.aboutAction) {
          this.messageBus.send(messageBuilder.listAllActions(agentId));
        } else {
          this.messageBus.send(
            messageBuilder.helpOnAction(agentId, action.aboutAction)
          );
        }
        break;

      case "query-agent-registry":
        this.messageBus.send(messageBuilder.listAgents(agentId, this.agentIds));
        break;

      case "send-message":
        const { targetAgentId } = action;
        // if (targetAgentId === "0")
        //   this.messageBus.send(
        //     messageBuilder.generic(
        //       agentId,
        //       `Thanks for your message, I will forward it to my human counterpart and then get back to you with their response.`
        //     )
        //   );
        // else
        if (this.agentIds.includes(action.targetAgentId))
          this.messageBus.send(
            messageBuilder.agentToAgent(
              agentId,
              [targetAgentId],
              action.message
            )
          );
        else
          this.messageBus.send(
            messageBuilder.error(
              agentId,
              `You tried to send your message to an invalid targetAgentId (${JSON.stringify(
                action.targetAgentId
              )}). You can use the 'query-agent-registry' action to see a list of available agents and their agent IDs.`
            )
          );
        break;

      case "list-directory":
        if (!this.checkPath(agentId, action.path)) break;
        readdir(action.path, (err, files) => {
          if (err) {
            this.messageBus.send(
              messageBuilder.error(agentId, JSON.stringify(err))
            );
          } else {
            this.messageBus.send(
              messageBuilder.generic(
                agentId,
                `Here are the contents of ${action.path}:\n${files
                  .map((file) => {
                    const stats = statSync(joinPath(action.path, file));
                    return `${file} ${
                      stats.isDirectory() ? "[directory]" : "[file]"
                    }`;
                  })
                  .join("\n")}`
              )
            );
          }
        });
        break;

      case "read-file":
        if (!this.checkPath(agentId, action.path)) break;
        readFile(action.path, "utf8", (err, data) => {
          // If there's an error, log it and exit
          if (err) {
            this.messageBus.send(
              messageBuilder.error(agentId, JSON.stringify(err))
            );
          } else {
            this.messageBus.send(
              messageBuilder.generic(
                agentId,
                `Contents of ${action.path}:\n\n${data}`
              )
            );
          }
        });
        break;

      case "write-file":
        if (!this.checkPath(agentId, action.path)) break;
        writeFile(action.path, action.newContent, "utf8", (err) => {
          if (err) {
            this.messageBus.send(
              messageBuilder.error(agentId, JSON.stringify(err))
            );
          } else {
            this.messageBus.send(
              messageBuilder.generic(agentId, `Wrote to ${action.path}.`)
            );
          }
        });
        break;

      default:
        assertNever(action);
        break;
    }
  }

  checkPath(agentId: string, path: string) {
    const currentDirectory = process.cwd();
    const resolvedPath = resolvePath(path);
    if (!resolvedPath.startsWith(currentDirectory)) {
      this.messageBus.send(
        messageBuilder.error(
          agentId,
          "Invalid path; must be within the current directory."
        )
      );
      return false;
    }
    if (
      resolvedPath.includes(".git") ||
      resolvedPath.includes("node_modules")
    ) {
      this.messageBus.send(
        messageBuilder.error(agentId, "That path is off-limits!")
      );
      return false;
    }
    return true;
  }
}

function assertNever(never: never) {}
