import { createHash, randomBytes } from "node:crypto";

export class SymoraError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

/** A signed-in Symora API client for one deployment's API root, e.g. https://host/api. */
export class Symora {
  private readonly origin: string;

  constructor(
    readonly base: string,
    private readonly session: string,
  ) {
    this.origin = new URL(base).origin;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        Cookie: `symora_session=${this.session}`,
        Origin: this.origin,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    if (!response.ok) {
      const code = typeof payload.code === "string" ? payload.code : undefined;
      const message = typeof payload.error === "string" ? payload.error : text;
      throw new SymoraError(response.status, code, `${method} ${path} → ${response.status} ${code ?? ""} ${message}`.trim());
    }
    return payload as T;
  }

  get = <T>(path: string) => this.request<T>("GET", path);
  post = <T>(path: string, body: unknown = {}) => this.request<T>("POST", path, body);
  patch = <T>(path: string, body: unknown) => this.request<T>("PATCH", path, body);
}

/**
 * Signs in through the CLI device flow: the person running the script approves
 * the request in their browser, and the script receives that browser session.
 */
export async function signIn(base: string): Promise<string> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const origin = new URL(base).origin;
  const post = async (path: string, body: unknown) => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };

  const start = await post("/auth/cli/device/start", { challenge });
  if (start.status !== 200 && start.status !== 201) throw new Error(`device sign-in failed: ${JSON.stringify(start.body)}`);
  const { device_code: code, verification_url: url, expires_in: expiresIn, poll_interval: interval } = start.body as {
    device_code: string;
    verification_url: string;
    expires_in: number;
    poll_interval: number;
  };
  console.log(`\nApprove this sign-in in your browser:\n  ${url}\n`);

  const deadline = Date.now() + expiresIn * 1000;
  while (Date.now() < deadline) {
    await sleep(Math.max(interval, 1) * 1000);
    const poll = await post("/auth/cli/device/token", { code, verifier });
    if (poll.status === 200 && poll.body.status === "complete") return String(poll.body.token);
    if (poll.status !== 202) throw new Error(`device sign-in failed: ${JSON.stringify(poll.body)}`);
  }
  throw new Error("device sign-in expired before it was approved");
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
