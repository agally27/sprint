import type { Page } from "@playwright/test";

/** Loads the demo mission and lands on home. */
export async function loadDemo(page: Page) {
  await page.goto("/");
  await page.getByTestId("load-demo").click();
  await page.getByTestId("home").waitFor();
}

/** Replaces the mocked Web Speech API with a scripted recogniser. */
export async function mockSpeech(page: Page, transcripts: string[], opts: { error?: string } = {}) {
  await page.addInitScript(
    ({ transcripts, error }) => {
      class FakeRecognition extends EventTarget {
        lang = "en-US";
        interimResults = false;
        continuous = false;
        maxAlternatives = 1;
        start() {
          setTimeout(() => {
            this.dispatchEvent(new Event("start"));
            if (error) {
              const e = new Event("error") as Event & { error: string; message: string };
              e.error = error;
              e.message = error;
              this.dispatchEvent(e);
              this.dispatchEvent(new Event("end"));
              return;
            }
            const text = transcripts.shift() ?? "";
            const partial = new Event("result") as Event & { results: unknown; resultIndex: number };
            const half = [{ transcript: text.slice(0, Math.ceil(text.length / 2)), confidence: 0.5 }] as unknown as { isFinal: boolean; length: number; [i: number]: unknown };
            half.isFinal = false;
            partial.results = [half];
            partial.resultIndex = 0;
            this.dispatchEvent(partial);
            const final = new Event("result") as Event & { results: unknown; resultIndex: number };
            const list = [{ transcript: text, confidence: 0.95 }] as unknown as { isFinal: boolean; length: number; [i: number]: unknown };
            list.isFinal = true;
            final.results = [list];
            final.resultIndex = 0;
            setTimeout(() => {
              this.dispatchEvent(final);
              this.dispatchEvent(new Event("end"));
            }, 120);
          }, 50);
        }
        stop() {
          this.dispatchEvent(new Event("end"));
        }
        abort() {
          this.dispatchEvent(new Event("end"));
        }
      }
      (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FakeRecognition;
    },
    { transcripts, error: opts.error ?? null },
  );
}

export async function mockNotifications(page: Page, permission: "granted" | "denied" | "default") {
  await page.addInitScript((permission) => {
    class FakeNotification {
      static permission = permission;
      static async requestPermission() {
        if (FakeNotification.permission === "default") FakeNotification.permission = "denied";
        return FakeNotification.permission;
      }
      constructor(public title: string, public options?: unknown) {}
    }
    (window as unknown as { Notification: unknown }).Notification = FakeNotification;
  }, permission);
}
