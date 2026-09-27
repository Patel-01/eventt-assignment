// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./shared/auth-context.js";
import { App } from "./app.js";

const sampleEvent = {
  id: "event-one", title: "Sunset Sessions: Rooftop Jazz", description: "A lovely evening with live music and good people.",
  startsAt: "2026-10-02T18:00:00.000Z", endsAt: "2026-10-02T20:00:00.000Z", location: "The Terrace, Varanasi",
  category: "Music", imageUrl: "https://example.com/event.jpg", hostName: "Maya Sharma", hostId: "host-one",
  attendeeCount: 12, attendeeAvatars: [], isAttending: false, createdAt: "2026-09-20T12:00:00.000Z",
};

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><AuthProvider><MemoryRouter><App /></MemoryRouter></AuthProvider></QueryClientProvider>);
}

beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [sampleEvent], total: 1 }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Gather web experience", () => {
  it("loads the event browse experience from the API", async () => {
    renderApp();
    expect((await screen.findAllByText("Sunset Sessions: Rooftop Jazz")).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /Find your kind of fun/i })).toBeTruthy();
  });

  it("lets a reviewer enter demo mode without an account", async () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    fireEvent.click(screen.getByRole("button", { name: /Continue in demo mode/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Pankaj/i })).toBeTruthy());
  });
});
