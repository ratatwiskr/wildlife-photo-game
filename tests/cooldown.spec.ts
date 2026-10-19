import { Cooldown } from "../src/utils/Cooldown";

describe("Cooldown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("starts inactive", () => {
    const cooldown = new Cooldown(100);
    expect(cooldown.isActive()).toBe(false);
  });

  test("trigger activates once per duration", () => {
    const cooldown = new Cooldown(100);

    expect(cooldown.trigger()).toBe(true);
    expect(cooldown.isActive()).toBe(true);
    // second trigger while still active is rejected
    expect(cooldown.trigger()).toBe(false);

    jest.advanceTimersByTime(100);
    expect(cooldown.isActive()).toBe(false);
    // can fire again after the duration elapsed
    expect(cooldown.trigger()).toBe(true);
  });
});
