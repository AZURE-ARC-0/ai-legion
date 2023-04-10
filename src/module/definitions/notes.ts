import { messageBuilder } from "../../message";
import { Store } from "../../store";
import { FileStore } from "../../store/file-store";
import { defineModule } from "../module";

export default defineModule<Store>({
  name: "note",
  createState: ({ agentId }) => new FileStore([agentId, "notes"]),
}).with({
  actions: {
    writeNote: {
      description: "Create or update a note which will only be visible to you.",
      parameters: {
        title: {
          description: "The title of the note",
        },
        content: {
          description: "The content of the note",
        },
      },
      async execute({
        parameters: { title, content },
        context: { sourceAgentId, state },
        sendMessage,
      }) {
        await state.set(title, content);
        sendMessage(
          messageBuilder.ok(
            sourceAgentId,
            `Note "${title}" has been written successfully.`
          )
        );
      },
    },

    viewNote: {
      description: "Display the content of a note.",
      parameters: {
        title: {
          description: "The title of the note to view",
        },
      },
      async execute({
        parameters: { title },
        context: { sourceAgentId, state },
        sendMessage,
      }) {
        const content = await state.get(title);
        if (content) {
          sendMessage(
            messageBuilder.ok(
              sourceAgentId,
              `Content of "${title}":\n\n${content}`
            )
          );
        } else {
          sendMessage(
            messageBuilder.error(sourceAgentId, `Note "${title}" not found.`)
          );
        }
      },
    },

    listNotes: {
      description: "List the titles of all existing notes.",
      async execute({ context: { sourceAgentId, state }, sendMessage }) {
        const noteTitles = await state.list();
        sendMessage(
          messageBuilder.ok(
            sourceAgentId,
            noteTitles.length
              ? `List of note titles:\n\n${noteTitles
                  .map((title) => `- ${title}`)
                  .join("\n")}`
              : "Your have no notes currently."
          )
        );
      },
    },

    deleteNote: {
      description: "Delete a note.",
      parameters: {
        title: {
          description: "The title of the note to delete",
        },
      },
      async execute({
        parameters: { title },
        context: { sourceAgentId, state },
        sendMessage,
      }) {
        if (await state.delete(title)) {
          sendMessage(
            messageBuilder.ok(sourceAgentId, `Deleted note "${title}".`)
          );
        } else {
          sendMessage(
            messageBuilder.error(sourceAgentId, `Note "${title}" not found.`)
          );
        }
      },
    },
  },
});
