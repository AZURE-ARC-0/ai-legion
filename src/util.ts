export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function sleepUntil(condition: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (condition()) return resolve();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      }
    }, 1000);
  });
}

export function agentName(agentId: string) {
  return `${agentId === "0" ? "Control" : `Agent ${agentId}`}`;
}

export const MULTILINE_DELIMITER = `% ${"ff9d7713-0bb0-40d4-823c-5a66de48761b"}`;
