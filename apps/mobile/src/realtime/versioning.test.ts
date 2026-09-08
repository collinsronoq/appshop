import { versionAction } from "./versioning";
describe("realtime version ordering",()=>{it("ignores stale and detects gaps",()=>{expect(versionAction(4,4)).toBe("ignore");expect(versionAction(4,5)).toBe("invalidate");expect(versionAction(4,7)).toBe("refetch");});});
