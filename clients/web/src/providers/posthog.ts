import { createContext } from "react";

export interface PostHogClient {
  set_config: (config: {
    persistence: "localStorage" | "sessionStorage" | "cookie" | "memory";
  }) => void;
  capture: (event: string, properties?: Record<string, unknown>) => void;
  get_distinct_id: () => string;
  identify: (id: string, properties?: Record<string, unknown>) => void;
  reset: () => void;
}

const noopClient: PostHogClient = {
  set_config: () => undefined,
  capture: () => undefined,
  get_distinct_id: () => "",
  identify: () => undefined,
  reset: () => undefined,
};

export const PostHogClientContext = createContext<PostHogClient>(noopClient);

export const createDeferredPostHogClient = (distinctId: string) => {
  let target: PostHogClient | undefined;
  let queue: Array<(client: PostHogClient) => void> = [];

  const enqueue = (operation: (client: PostHogClient) => void) => {
    if (target) operation(target);
    else queue.push(operation);
  };

  const client: PostHogClient = {
    set_config: (config) => enqueue((next) => next.set_config(config)),
    capture: (event, properties) =>
      enqueue((next) => next.capture(event, properties)),
    get_distinct_id: () => target?.get_distinct_id() ?? distinctId,
    identify: (id, properties) =>
      enqueue((next) => next.identify(id, properties)),
    reset: () => enqueue((next) => next.reset()),
  };

  return {
    client,
    connect(next: PostHogClient) {
      target = next;
      for (const operation of queue) operation(next);
      queue = [];
    },
    clear() {
      queue = [];
    },
  };
};
