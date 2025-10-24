import { TaskManager } from "@/taskManager";

describe("TaskManager", () => {
  test("starts at first task", () => {
    const tm = new TaskManager([
      { id: "birds", title: "Find all 🐦", color: "#ff0000" },
      { id: "elephants", title: "Find 🐘", color: "#00ff00" },
    ]);
    expect(tm.current.id).toBe("birds");
  });

  test("progresses to next task", () => {
    const tm = new TaskManager([
      { id: "birds", title: "Find all 🐦", color: "#ff0000" },
      { id: "elephants", title: "Find 🐘", color: "#00ff00" },
    ]);
    tm.nextTask();
    expect(tm.current.id).toBe("elephants");
  });

  test("detects when all tasks complete", () => {
    const tm = new TaskManager([
      { id: "birds", title: "Find all 🐦", color: "#ff0000" },
    ]);
    tm.nextTask();
    expect(tm.isFinished()).toBe(true);
  });
});
