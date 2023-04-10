import Ajv from "ajv";
import actionDictionary from "../schema/action-dictionary.json";
import { Action } from "./action-types";
import { MULTILINE_DELIMITER } from "./util";

type ParseResult<T> =
  | { type: "success"; value: T }
  | { type: "error"; message: string };

const validate = new Ajv().compile(actionDictionary);

export default function parseAction(text: string): ParseResult<Action> {
  let result: Action;

  text = `name: ${text.trim()}`;

  try {
    const jsonText =
      "{" +
      text
        .split(MULTILINE_DELIMITER)
        .map((part) => part.trim())
        .map((part, i) => {
          if (i % 2 === 0) return part;
          const escaped = JSON.stringify(part);
          return escaped.substring(1, escaped.length - 1);
        })
        .join("")
        .split("\n")
        .map((line) => {
          const colonIndex = line.indexOf(":");
          if (colonIndex < 0) throw new Error("line is missing a colon");
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          return `"${key}": "${value}"`;
        })
        .join(",") +
      "}";

    result = JSON.parse(jsonText);
  } catch (e) {
    return {
      type: "error",
      message: `Error parsing ${text}: ${e}`,
    };
  }

  if (!validate(result)) {
    return {
      type: "error",
      message: `Unrecognized action: ${text}\n\nValidation errors: ${JSON.stringify(
        validate.errors
      )}`,
    };
  }

  return { type: "success", value: result };
}
